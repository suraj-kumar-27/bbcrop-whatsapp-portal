import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs-extra';
import path from 'path';

CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + width, y, x + width, y + height, radius);
    this.arcTo(x + width, y + height, x, y + height, radius);
    this.arcTo(x, y + height, x, y, radius);
    this.arcTo(x, y, x + width, y, radius);
    this.closePath();
    return this;
};

class ImageGeneratorService {
    constructor() {
        // Register fonts (place these font files in a 'fonts' directory)
        const fontPath = path.join(process.cwd(), 'assets', 'fonts');
        fs.mkdirSync(fontPath, { recursive: true });

        // You'll need to download and place these font files in your project
        try {
            registerFont(path.join(fontPath, 'Inter-Regular.ttf'), { family: 'Inter', weight: 'normal' });
            registerFont(path.join(fontPath, 'Inter-Bold.ttf'), { family: 'Inter', weight: 'bold' });
        } catch (error) {
            console.log('Font registration error (non-critical):', error.message);
        }
    }

    async generateAccountSummaryImage(userData) {
        try {
            const {
                userName,
                totalBalance,
                realAccounts,
                demoAccounts,
                realTotalBalance,
                demoTotalBalance
            } = userData;

            // Canvas setup - match dimensions to your design
            const width = 500;
            const height = 650 + (Math.max(realAccounts.length, demoAccounts.length) * 30);
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#f0f8ff'; // Light blue background
            ctx.fillRect(0, 0, width, height);

            // Top border line
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, width, 3);

            // Header section
            ctx.fillStyle = '#0288d1'; // Blue color for header text
            ctx.font = 'bold 26px Inter';
            ctx.fillText(`${userName}'s Account`, 20, 45);

            ctx.fillStyle = '#333'; // Dark color for Summary text
            ctx.font = 'bold 26px Inter';
            ctx.fillText('Summary', 20, 75);

            // Top right balance box
            ctx.fillStyle = '#e3f2fd'; // Light blue background for balance
            ctx.roundRect(width - 180, 40, 160, 50, 10);
            ctx.fill();

            // Small USD label
            ctx.fillStyle = '#0288d1';
            ctx.font = '14px Inter';
            ctx.fillText('USD', width - 160, 60);

            // Main balance amount
            ctx.fillStyle = '#333';
            ctx.font = 'bold 18px Inter';
            ctx.fillText(totalBalance.toFixed(2), width - 160, 80);

            // Draw wallet icon
            const walletIcon = '💳'; // Using emoji as placeholder
            ctx.font = '20px Inter';
            ctx.fillText(walletIcon, width - 175, 70);

            // Real Account section
            ctx.fillStyle = '#333';
            ctx.font = 'bold 18px Inter';
            ctx.fillText('Real Account(s)', 20, 130);

            // Real account total balance
            ctx.fillStyle = '#666';
            ctx.font = '14px Inter';
            ctx.fillText('Total Real Balance', width - 160, 130);

            ctx.fillStyle = '#333';
            ctx.font = 'bold 14px Inter';
            ctx.fillText(realTotalBalance.toFixed(2), width - 160, 150);
            ctx.fillText('💳', width - 140, 150);

            // Table headers
            const tableY = 160;
            ctx.fillStyle = '#777';
            ctx.font = '14px Inter';
            ctx.fillText('SN', 30, tableY);
            ctx.fillText('Beneficiary Name', 90, tableY);
            ctx.fillText('Amount', width - 100, tableY);

            // Draw real accounts
            let offsetY = 30;
            realAccounts.forEach((account, index) => {
                const y = tableY + offsetY;

                ctx.fillStyle = '#333';
                ctx.font = '14px Inter';
                ctx.fillText((index + 1).toString(), 30, y);
                ctx.fillText(account.name, 90, y);
                ctx.fillText(`${account.balance.toFixed(2)} USD`, width - 100, y);

                offsetY += 30;
            });

            // Demo Account section
            const demoY = tableY + offsetY + 20;
            ctx.fillStyle = '#333';
            ctx.font = 'bold 18px Inter';
            ctx.fillText('Demo Account(s)', 20, demoY);

            // Demo account total balance
            ctx.fillStyle = '#666';
            ctx.font = '14px Inter';
            ctx.fillText('Total Demo Balance', width - 160, demoY);

            ctx.fillStyle = '#333';
            ctx.font = 'bold 14px Inter';
            ctx.fillText(demoTotalBalance.toFixed(2), width - 160, demoY + 20);
            ctx.fillText('💳', width - 140, demoY + 20);

            // Demo account table headers
            const demoTableY = demoY + 30;
            ctx.fillStyle = '#777';
            ctx.font = '14px Inter';
            ctx.fillText('SN', 30, demoTableY);
            ctx.fillText('Beneficiary Name', 90, demoTableY);
            ctx.fillText('Amount', width - 100, demoTableY);

            // Draw demo accounts
            offsetY = 30;
            demoAccounts.forEach((account, index) => {
                const y = demoTableY + offsetY;

                ctx.fillStyle = '#333';
                ctx.font = '14px Inter';
                ctx.fillText((index + 1).toString(), 30, y);
                ctx.fillText(account.name, 90, y);
                ctx.fillText(`${account.balance.toFixed(2)} USD`, width - 100, y);

                offsetY += 30;
            });

            // Risk disclaimer
            const disclaimerY = demoTableY + offsetY + 30;
            ctx.fillStyle = '#666';
            ctx.font = '12px Inter';
            ctx.fillText('Trading Involves Risk', 20, disclaimerY);

            // Logo at bottom right (use your logo)
            ctx.font = 'bold 24px Inter';
            ctx.fillStyle = '#0288d1';
            ctx.fillText('bbc', width - 70, disclaimerY);

            // Save the image to a buffer
            const buffer = canvas.toBuffer('image/png');

            // Create directory if it doesn't exist
            const uploadDir = path.join(process.cwd(), 'uploads', 'account-summaries');
            fs.mkdirSync(uploadDir, { recursive: true });

            // Save file with timestamp to ensure uniqueness
            const fileName = `account_summary_${Date.now()}.png`;
            const filePath = path.join(uploadDir, fileName);

            await fs.writeFile(filePath, buffer);
            return filePath;
        } catch (error) {
            console.error('Error generating account summary image:', error);
            throw error;
        }
    }
}

export default new ImageGeneratorService();