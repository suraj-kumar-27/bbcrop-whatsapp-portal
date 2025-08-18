import path from 'path';
import fs from 'fs';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import ExcelJS from 'exceljs';

import { PrismaClient } from "@prisma/client";
import { table } from 'console';
const prisma = new PrismaClient();

const root = path.normalize(`${__dirname}/../..`);
const uploadFolder = path.normalize(`${__dirname}/../../uploads`);

export default {

    generateSwaggerJSON: async () => {
        try {
            const swaggerDefinition = {
                info: {
                    title: "export",
                    version: "3.0",
                    description: "export data"
                },
                basePath: "/api/v1",
                securityDefinitions: {
                    tokenauth: {
                        type: "apiKey",
                        name: "Authorization",
                        in: "header"
                    }
                }
            };

            const options = {
                swaggerDefinition,
                apis: [
                    path.resolve(`${root}/server/api/controllers/**/*.js`),
                    path.resolve(`${root}/api.yaml`),
                ],
            };


            const swaggerJson = swaggerJSDoc(options);

            const result = await structuredDataJson(swaggerJson);

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, { recursive: true });
            }
            const filePath = path.resolve(`${uploadFolder}/swagger.json`);
            fs.writeFileSync(filePath, JSON.stringify(swaggerJson, null, 2));

            return result;

        } catch (error) {
            console.log(error);
            throw error;
        }
    },

    generateExcelFromPrismaSchema: async () => {
        try {
            // Create a new workbook
            const workbook = new ExcelJS.Workbook();
            const mainWorksheet = workbook.addWorksheet('Database Schema');
            let currentColumn = 1;

            // Get table names and their corresponding fields and data types using raw SQL
            const tablesResult = await prisma.$queryRaw`
                SELECT 
                    m.name AS TABLE_NAME, 
                    p.name AS COLUMN_NAME, 
                    p.type AS DATA_TYPE 
                FROM 
                    sqlite_master AS m 
                JOIN 
                    pragma_table_info(m.name) AS p 
                WHERE 
                    m.type = 'table' 
                ORDER BY 
                    m.name, p.cid;
            `;

            // Create a map to store fields and their data types for each table
            const tableFields = {};

            tablesResult.forEach(row => {
                const { TABLE_NAME, COLUMN_NAME, DATA_TYPE } = row;
                if (!tableFields[TABLE_NAME]) {
                    tableFields[TABLE_NAME] = [];
                }
                // Map SQL data type to Prisma data type
                const prismaDataType = mapDataType(DATA_TYPE);
                tableFields[TABLE_NAME].push([COLUMN_NAME, prismaDataType]);
            });

            // Define a border style for the cells
            const borderStyle = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };

            // Loop through each table and write data to the Excel sheet
            let tableCount = 0;
            for (const [tableName, fields] of Object.entries(tableFields)) {
                tableCount++;
                // console.log(`Processing table: ${tableName}`);

                // Merge the first three columns (table name will span across 3 columns)
                mainWorksheet.mergeCells(1, currentColumn, 1, currentColumn + 2);
                const mergedCell = mainWorksheet.getCell(1, currentColumn);
                mergedCell.value = tableName;

                const headerFill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '4485F5' },
                };

                // Apply fill and border styles to the merged table name cell
                mergedCell.fill = headerFill;
                mergedCell.border = borderStyle;

                // Add the field headers (Field, Data Type, Relation)
                mainWorksheet.getCell(2, currentColumn).value = 'Field';
                mainWorksheet.getCell(2, currentColumn + 1).value = 'Data Type';
                mainWorksheet.getCell(2, currentColumn + 2).value = 'Relation';

                // Apply fill, border to field header cells and ensure top border is highlighted
                for (let col = currentColumn; col <= currentColumn + 2; col++) {
                    const headerCell = mainWorksheet.getCell(2, col);
                    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '58AB58' } };
                    headerCell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                }

                // Apply fill, border, and write data to cells
                fields.forEach(([fieldName, fieldType], index) => {
                    const rowIndex = index + 3;
                    mainWorksheet.getCell(rowIndex, currentColumn).value = fieldName;
                    mainWorksheet.getCell(rowIndex, currentColumn + 1).value = fieldType;

                    const cellFill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFCCCC' },
                    };

                    // Apply styles and borders to data cells
                    for (let col = currentColumn; col <= currentColumn + 2; col++) {
                        const dataCell = mainWorksheet.getCell(rowIndex, col);
                        dataCell.fill = cellFill;
                        dataCell.border = borderStyle;  // Apply border to every cell, including top
                    }
                });

                currentColumn += 4; // Move to the next set of columns for the next table
            }

            console.log(`Table count: ${tableCount}`);
            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, { recursive: true });
            }
            // Save the Excel file
            const excelFileName = path.resolve(`${uploadFolder}/DatabaseSchema-${Date.now()}.xlsx`);
            await workbook.xlsx.writeFile(excelFileName);
            console.log(`Excel file "${excelFileName}" created successfully.`);
            return excelFileName;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }


}

async function structuredDataJson(swaggerData) {
    try {
        // Extract the data and structure it
        const newData = [];
        function resolveRefSchema(ref) {
            const schemaName = ref.split('/').pop();
            if (swaggerData.definitions[schemaName]) {
                return swaggerData.definitions[schemaName].properties || {};
            }
            return {};
        }

        function processSchemaProperties(properties, output = {}) {
            if (!properties) return;

            Object.keys(properties).forEach(prop => {
                const property = properties[prop];

                if (property && property.$ref) {
                    // If the property is a $ref, resolve it
                    const schemaProperties = resolveRefSchema(property.$ref);
                    output[prop] = {};
                    processSchemaProperties(schemaProperties, output[prop]);
                } else if (property && property.type === 'array') {
                    // If the property is an array, process the items inside the array
                    output[prop] = [];
                    if (property.items) {
                        if (property.items.$ref) {
                            const arrayItemSchema = resolveRefSchema(property.items.$ref);
                            const arrayItemOutput = {};
                            processSchemaProperties(arrayItemSchema, arrayItemOutput);
                            output[prop].push(arrayItemOutput);
                        } else if (property.items.properties) {
                            const arrayItemOutput = {};
                            processSchemaProperties(property.items.properties, arrayItemOutput);
                            output[prop].push(arrayItemOutput);
                        } else {
                            output[prop].push(property.items.example || '');
                        }
                    }
                } else if (property && property.type === 'object' && property.properties) {
                    // If the property is an object, process its inner properties
                    output[prop] = {};
                    processSchemaProperties(property.properties, output[prop]);
                } else {
                    // For primitive types, assign the example or an empty string
                    output[prop] = property ? property.example || '' : '';
                }
            });
        }

        // Iterate over all paths and methods in the Swagger data
        for (const path in swaggerData.paths) {
            const methods = Object.keys(swaggerData.paths[path]);

            methods.forEach(method => {
                const endpointData = {
                    // path: path,
                    path: 'api/v1' + path,
                    method: method.toUpperCase(),
                    description: swaggerData.paths[path][method].description || swaggerData.paths[path][method].summary || '',
                    tags: swaggerData.paths[path][method].tags[0] || '',
                    parameters: {
                        body: {},
                        query: {}
                    },
                    response: {
                        successResponse: {
                            error: 'false',
                            message: 'Success message',
                            data: {}
                        },
                        errorResponse: {
                            code: 404,
                            error: 'true',
                            message: 'Error message'
                        }
                    },
                    status: 'Completed',

                };

                // Handle parameters
                if (swaggerData.paths[path][method].parameters) {
                    swaggerData.paths[path][method].parameters.forEach(param => {
                        if (param.in === 'formData') {
                            endpointData.parameters.body[param.name] = param.example || '';
                        } else if (param.in === 'query') {
                            endpointData.parameters.query[param.name] = param.example || '';
                        } else if (param.in === 'body' && param.schema) {
                            if (param.schema.$ref) {
                                // Resolve $ref schema in body
                                const schemaProperties = resolveRefSchema(param.schema.$ref);
                                processSchemaProperties(schemaProperties, endpointData.parameters.body);
                            } else if (param.schema.properties) {
                                // Handle inline properties in body
                                processSchemaProperties(param.schema.properties, endpointData.parameters.body);
                            }
                        }
                    });
                }

                // Handle OpenAPI 3.x style with requestBody
                if (swaggerData.paths[path][method].requestBody && swaggerData.paths[path][method].requestBody.content) {
                    const content = swaggerData.paths[path][method].requestBody.content;

                    // Check for 'application/json' or other media types
                    if (content['application/json'] && content['application/json'].schema) {
                        const schema = content['application/json'].schema;

                        if (schema.$ref) {
                            // Handle $ref in requestBody schema
                            const schemaProperties = resolveRefSchema(schema.$ref);
                            processSchemaProperties(schemaProperties, endpointData.parameters.body);
                        } else if (schema.properties) {
                            // Handle inline schema properties in requestBody
                            processSchemaProperties(schema.properties, endpointData.parameters.body);
                        }
                    }
                }


                newData.push(endpointData);
            });
        }

        const excelFile = await createExcelFile(newData)
        return excelFile
    } catch (error) {
        throw error;

    }
}

async function createExcelFile(structuredData) {
    try {

        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        // Add a worksheet
        const worksheet = workbook.addWorksheet('Swagger Apis list');

        // Define headers
        const headers = Object.keys(structuredData[0]);
        worksheet.addRow(headers);

        // Add data to the worksheet
        structuredData.forEach(data => {
            const values = headers.map(header => data[header]);
            const row = worksheet.addRow(values);

            // Set wrap text for each cell in the row
            // row.eachCell(cell => {
            //     cell.alignment = { wrapText: true, horizontal: 'center'}; // Enable text wrapping
            // });
        });

        // Save the workbook
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true });
        }
        const excelFileName = path.resolve(`${uploadFolder}/Swagger_api_list-${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(excelFileName);
        console.log(`Excel file "${excelFileName}" created successfully.`);
        return excelFileName;

    } catch (error) {
        console.error('Error writing Excel file:', error);
        throw error;

    }
}

const mapDataType = (sqlDataType) => {
    switch (sqlDataType.toLowerCase()) {
        case 'integer':
        case 'int':
            return 'Int';
        case 'bigint':
            return 'BigInt';
        case 'smallint':
            return 'SmallInt';
        case 'tinyint':
            return 'TinyInt';
        case 'varchar':
        case 'text':
        case 'nvarchar':
            return 'String';
        case 'real':
        case 'double':
        case 'float':
            return 'Float';
        case 'decimal':
        case 'numeric':
            return 'Decimal';
        case 'boolean':
            return 'Boolean';
        case 'blob':
            return 'Bytes';
        case 'datetime':
        case 'timestamp':
            return 'DateTime';
        default:
            return 'Unknown';
    }
};


const generatePrismaFromDb = async () => {
    try {

        const mapDataType = (sqlType, isPrimaryKey = false) => {
            let type;
            switch (sqlType.toLowerCase()) {
                case 'int':
                    type = 'Int';
                    break;  // Do not mark as optional
                case 'varchar':
                case 'nvarchar':
                case 'text':
                    type = 'String? @db.Text';  // Keep this as optional
                    break;
                case 'datetime':
                    type = 'DateTime?';  // Marking field as optional
                    break;
                case 'float':
                    type = 'Float?';  // Marking field as optional
                    break;
                case 'decimal':
                    type = 'Decimal?';  // Marking field as optional
                    break;
                default:
                    type = 'String? @db.Text';  // Fallback to optional String with @db.Text for unknown types
            }

            // If the field is a primary key, remove the optional marker
            if (isPrimaryKey) {
                return type.replace('?', ''); // Make it non-optional
            }
            return type;
        };

        const toValidPrismaName = (str) => {
            const numberWords = {
                1: 'first',
                2: 'second',
                3: 'third',
                4: 'fourth',
                5: 'fifth',
                6: 'sixth',
                7: 'seventh',
                8: 'eighth',
                9: 'ninth',
                0: 'zero'
            };

            // Replace leading digit with corresponding word
            str = str.replace(/^(\d)/, (match) => numberWords[match]);

            return str
                .replace(/[%]/g, 'Percent')
                .replace(/[+]/g, 'Plus')
                .replace(/[&]/g, 'And')
                .replace(/[*]/g, 'Multiplied')
                .replace(/[\s/]/g, ' ') // Normalize spaces
                .replace(/[\(\)]/g, '') // Remove parentheses
                .replace(/[$]/g, '')
                .trim()
                .replace(/[-]/g, ' ') // Convert dashes and underscores to spaces
                .split(' ')
                .map((word, index) => {
                    if (index === 0) {
                        return word.charAt(0).toLowerCase() + word.slice(1).toLowerCase(); // Lowercase first word
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); // Uppercase subsequent words
                })
                .join(''); // Join words together
        };



        // Get table names and fields
        const tablesResult = await prisma.$queryRaw`
            SELECT 
                TABLE_NAME AS tableName, 
                COLUMN_NAME AS columnName, 
                DATA_TYPE AS dataType 
            FROM 
                INFORMATION_SCHEMA.COLUMNS 
            WHERE 
                TABLE_SCHEMA = 'dbo'
            ORDER BY 
                TABLE_NAME, ORDINAL_POSITION;
        `;

        const uniqueFieldsResult = await prisma.$queryRaw`
            SELECT 
                tc.TABLE_NAME AS tableName, 
                ku.COLUMN_NAME AS columnName 
            FROM 
                INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc 
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME 
            WHERE 
                tc.CONSTRAINT_TYPE = 'UNIQUE'
                AND tc.TABLE_SCHEMA = 'dbo';
        `;

        const primaryKeysResult = await prisma.$queryRaw`
            SELECT 
                tc.TABLE_NAME AS tableName, 
                ku.COLUMN_NAME AS columnName 
            FROM 
                INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc 
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME 
            WHERE 
                tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
                AND tc.TABLE_SCHEMA = 'dbo';
        `;

        const tableFields = {};
        const uniqueFields = {};
        const primaryKeys = {};

        tablesResult.forEach(row => {
            const { tableName, columnName, dataType } = row;
            if (!tableFields[tableName]) {
                tableFields[tableName] = [];
            }

            // Check if the column is a primary key to pass the flag
            let isPrimaryKey = false;
            if (primaryKeys[tableName]) {
                isPrimaryKey = primaryKeys[tableName].includes(columnName) || false;
            }
            const prismaDataType = mapDataType(dataType, isPrimaryKey);
            tableFields[tableName].push([columnName, prismaDataType]);
        });

        uniqueFieldsResult.forEach(row => {
            const { tableName, columnName } = row;
            if (!uniqueFields[tableName]) {
                uniqueFields[tableName] = [];
            }
            uniqueFields[tableName].push(columnName);
        });

        primaryKeysResult.forEach(row => {
            const { tableName, columnName } = row;
            if (!primaryKeys[tableName]) {
                primaryKeys[tableName] = [];
            }
            primaryKeys[tableName].push(columnName);
        });

        let prismaSchema = '';

        // Loop through tables and generate schema
        for (const [tableName, fields] of Object.entries(tableFields)) {
            const camelCaseTable = toValidPrismaName(tableName);
            prismaSchema += `\n\nmodel ${camelCaseTable} {\n`;

            fields.forEach(([fieldName, fieldType]) => {
                const validPrismaField = toValidPrismaName(fieldName);
                prismaSchema += `    ${validPrismaField} ${fieldType} @map("${fieldName}")\n`; // Original DB name mapping
            });

            // Add primary key constraints
            if (primaryKeys[tableName]) {
                const primaryKeysList = primaryKeys[tableName].map(field => toValidPrismaName(field)).join(', ');
                prismaSchema += `    @@id([${primaryKeysList}])\n`; // Define the primary key
            }

            // Add unique constraints
            if (uniqueFields[tableName]) {
                const uniqueFieldsList = uniqueFields[tableName].map(field => toValidPrismaName(field)).join(', ');
                prismaSchema += `    @@unique([${uniqueFieldsList}])\n`;
            }

            prismaSchema += `    @@map("${tableName}")\n`; // Map model name to original table name
            prismaSchema += `}\n`;
        }

        // Create upload folder if it doesn't exist
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true });
        }

        // Save the Prisma schema file
        const prismaFile = path.resolve(`${uploadFolder}/DatabaseSchema-${Date.now()}.prisma`);
        fs.writeFileSync(prismaFile, prismaSchema, 'utf8');
        console.log(`Prisma schema file "${prismaFile}" created successfully.`);

        return prismaFile;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
};
