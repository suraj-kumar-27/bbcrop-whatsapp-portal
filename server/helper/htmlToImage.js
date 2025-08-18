import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import utils from './utils';

function generateHtmlFromTemplate(data) {
    const htmlPath = path.resolve(__dirname, '../../public/htmlToImage/index.html');
    let htmlTemplate = '';

    try {
        htmlTemplate = fs.readFileSync(htmlPath, 'utf8');
    } catch (error) {
        throw new Error(`Could not read HTML template file: ${error.message}`);
    }

    // Correct path to the CSS file in public/htmlToImage
    const cssPath = path.resolve(__dirname, '../../public/htmlToImage/style.css');
    let cssContent = '';
    try {
        cssContent = fs.readFileSync(cssPath, 'utf8');
    } catch (error) {
        console.warn('Warning: Could not read style.css file');
    }

    const imageToBase64 = (imagePath) => {
        try {
            // Correct path to images in public/htmlToImage/images
            const fullPath = path.resolve(__dirname, '../../public/htmlToImage', imagePath);
            const imageBuffer = fs.readFileSync(fullPath);
            const ext = path.extname(imagePath).substring(1);
            const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } catch (error) {
            console.warn(`Warning: Could not read image file ${imagePath}:`, error.message);
            return '';
        }
    };

    const generateTableRows = (accounts) => {
        return accounts.map(account =>
            `                    <tr>
                        <td>${account.sn}</td>
                        <td>${account.name}</td>
                        <td>${account.amount}</td>
                    </tr>`
        ).join('\n');
    };

    htmlTemplate = htmlTemplate.replace(
        '<link rel="stylesheet" href="style.css" />',
        `<style>\n${cssContent}\n    </style>`
    );

    // Replace image sources with base64 data URLs
    htmlTemplate = htmlTemplate.replace(
        'src="images/10149443.png"',
        `src="${imageToBase64('images/10149443.png')}"`
    );

    htmlTemplate = htmlTemplate.replace(
        'src="images/header-logo.png"',
        `src="${imageToBase64('images/header-logo.png')}"`
    );

    // Replace placeholders with dynamic data
    const processedHtml = htmlTemplate
        .replace(/{{ACCOUNT_HOLDER_NAME}}/g, data.accountHolderName)
        .replace(/{{CURRENCY}}/g, data.currency)
        .replace(/{{BALANCE}}/g, data.balance)
        .replace(/{{REAL_ACCOUNTS_ROWS}}/g, generateTableRows(data.realAccounts))
        .replace(/{{DEMO_ACCOUNTS_ROWS}}/g, generateTableRows(data.demoAccounts));

    return processedHtml;
}


function generateHtmlFromTransactionTemplate(data) {
    const htmlPath = path.resolve(__dirname, '../../public/htmlToImage/transaction.html');
    let htmlTemplate = '';

    try {
        htmlTemplate = fs.readFileSync(htmlPath, 'utf8');
    } catch (error) {
        throw new Error(`Could not read HTML template file: ${error.message}`);
    }

    // Correct path to the CSS file in public/htmlToImage
    const cssPath = path.resolve(__dirname, '../../public/htmlToImage/style.css');
    let cssContent = '';
    try {
        cssContent = fs.readFileSync(cssPath, 'utf8');
    } catch (error) {
        console.warn('Warning: Could not read style.css file');
    }

    const imageToBase64 = (imagePath) => {
        try {
            // Correct path to images in public/htmlToImage/images
            const fullPath = path.resolve(__dirname, '../../public/htmlToImage', imagePath);
            const imageBuffer = fs.readFileSync(fullPath);
            const ext = path.extname(imagePath).substring(1);
            const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } catch (error) {
            console.warn(`Warning: Could not read image file ${imagePath}:`, error.message);
            return '';
        }
    };


    const generateTableRows = (transactions) => {
        return transactions.map(trx =>
            `   <tr>
                    <td>${trx.sn}</td>
                    <td>${trx.date}</td>
                    <td>${trx.type}</td>
                    <td>${trx.status}</td>
                    <td>${trx.amount}</td>
                </tr>`
        ).join('\n');
    };

    htmlTemplate = htmlTemplate.replace(
        '<link rel="stylesheet" href="style.css" />',
        `<style>\n${cssContent}\n    </style>`
    );

    // Replace image sources with base64 data URLs
    htmlTemplate = htmlTemplate.replace(
        'src="images/10149443.png"',
        `src="${imageToBase64('images/10149443.png')}"`
    );

    htmlTemplate = htmlTemplate.replace(
        'src="images/header-logo.png"',
        `src="${imageToBase64('images/header-logo.png')}"`
    );

    // Replace placeholders with dynamic data
    const processedHtml = htmlTemplate
        .replace(/{{ACCOUNT_HOLDER_NAME}}/g, data.accountHolderName)
        .replace(/{{TRANSACTION_HISTORY_ROWS}}/g, generateTableRows(data.transactionHistory))

    return processedHtml;
}

export const convertHtmlToImage = async (data = {}, type = 'account') => {
    let browser;

    try {
        console.log('Starting HTML to Image conversion...');

        const accountData = { ...data };

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setViewport({
            width: 1200,
            height: 800,
            deviceScaleFactor: 4
        });
        let htmlContent;

        if (type === 'transaction') {
            htmlContent = generateHtmlFromTransactionTemplate(accountData);
        } else {
            htmlContent = generateHtmlFromTemplate(accountData);
        }


        console.log('Loading dynamic HTML content from template...');

        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });


        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const containerElement = await page.$('.container');
        if (containerElement) {
            const imageBuffer = await containerElement.screenshot({
                type: 'png'
            });
            console.log(`✅ Container image generated as buffer`);
            const imageUrl = await utils.getImageUrl(imageBuffer)
            return imageUrl;
        } else {
            console.error('❌ Could not find .container element');
            throw new Error('Could not find .container element');
        }

    } catch (error) {
        console.error('❌ Error converting HTML to image:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
