const translate = require('google-translate-api-x');
const keepInEnglish = [];
const targetLang = "ar"; // Arabic

export const smartTranslate = async (inputText) => {
    const placeholderMap = {};
    let tempText = inputText;

    keepInEnglish.forEach((word, index) => {
        const placeholder = `{{${index}}}`;
        const regex = new RegExp(`\\b(${word})\\b`, 'gi');
        tempText = tempText.replace(regex, (match) => {
            placeholderMap[placeholder] = match;
            return placeholder;
        });
    });

    const result = await translate(tempText, { to: targetLang, autoCorrect: true });
    let translated = result.text;

    Object.entries(placeholderMap).forEach(([placeholder, originalWord]) => {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        translated = translated.replace(regex, originalWord);
    });

    return translated;
}

