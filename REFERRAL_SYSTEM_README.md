# WhatsApp Referral System Implementation

## Features Added

### 1. Enhanced Refer and Earn Flow
- Modified the existing `menu_list_refer_and_earn` handler to generate both website and WhatsApp referral links
- Extracts referral code from the CRM API response
- Creates a WhatsApp join link with pre-filled message containing the referral code

### 2. Automatic Referral Code Detection
- Detects when users join via WhatsApp with referral codes
- Supports multiple message formats:
  - "Hi BBCorp! I want to join with referral code: ABC123"
  - "referral code: ABC123"
  - "ref: ABC123"
- Automatically saves referral code to user session

### 3. Signup Integration
- Referral code is automatically included in the signup payload when user completes registration
- Displays confirmation message when referral code is applied
- Preserves referral code even if user restarts the signup process

### 4. Enhanced User Experience
- Clear instructions on how the referral system works
- Confirmation messages when referral codes are detected and applied
- Maintains referral code throughout the entire user journey

## Configuration Required

### WhatsApp Business Number
Update the WhatsApp business number in the code or set environment variable:

```javascript
// In controller.js, line ~1196
const whatsappBusinessNumber = process.env.WHATSAPP_BUSINESS_NUMBER || '+1234567890';
```

Set the environment variable:
```bash
WHATSAPP_BUSINESS_NUMBER=+1234567890  # Replace with your actual number
```

### Support Contact Numbers
Update the support contact information in:
- Line ~1258: Phone number
- Line ~1259: WhatsApp number

## How It Works

### For Existing Users (Sharing Referrals)
1. User selects "Refer and Earn" from the menu
2. System fetches their referral link from CRM API
3. System generates both web and WhatsApp referral links
4. User receives message with:
   - Website referral link
   - WhatsApp join link with pre-filled referral code
   - Instructions on how to share

### For New Users (Joining via Referral)
1. Friend clicks WhatsApp referral link
2. WhatsApp opens with pre-filled message containing referral code
3. Friend sends message to join
4. System detects referral code and saves it to session
5. User goes through normal registration process
6. Referral code is automatically applied during signup

## Example Messages

### Referral Message for Existing Users
```
🤝 *Refer and Earn Program!*

Share these links with your friends to earn rewards:

📎 *Website Referral Link:*
https://example.com/referral/ABC123

💬 *WhatsApp Join Link:*
https://wa.me/+1234567890?text=Hi%20BBCorp!%20I%20want%20to%20join%20with%20referral%20code:%20ABC123

🎁 *Your Referral Code:* `ABC123`

✨ *How it works:*
• Share the WhatsApp link with friends
• They click and join our WhatsApp channel
• Their referral code is automatically applied
• You both earn rewards when they start trading!

📱 When your friends click the WhatsApp link, they'll be directed to our WhatsApp channel and can signup instantly with your referral code!
```

### Welcome Message for New Users with Referral
```
🎉 *Welcome to BBCorp!*

Thanks for joining us with referral code: `ABC123`

You're about to start an amazing trading journey! 🚀

Your referral code has been saved and will be applied when you complete registration.

Let's get started! Please choose your preferred language:
```

## Testing

### Test Referral Code Detection
Send any of these messages to test:
- "Hi BBCorp! I want to join with referral code: TEST123"
- "referral code: TEST123"
- "ref: TEST123"

### Test Referral Link Generation
1. Complete login flow
2. Select "Refer and Earn" from menu
3. Verify both website and WhatsApp links are generated

## Error Handling
- Graceful fallback if CRM API fails to provide referral link
- Invalid referral code formats are ignored
- Referral code is preserved through signup restarts
- Clear error messages for users

## Future Enhancements
1. Add referral code validation against CRM API
2. Track referral conversion metrics
3. Add reward notifications
4. Support for custom referral messages
5. Bulk referral link generation for campaigns
