const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

// --- YENİ KISIM: Fontların URL'leri ---
const FONT_BLACK_URL = 'https://raw.githubusercontent.com/jimp-dev/jimp/main/packages/plugin-print/fonts/open-sans/open-sans-32-black/open-sans-32-black.fnt';
const FONT_WHITE_URL = 'https://raw.githubusercontent.com/jimp-dev/jimp/main/packages/plugin-print/fonts/open-sans/open-sans-16-white/open-sans-16-white.fnt';
// ------------------------------------

const BACKGROUND_IMAGE_PATH = path.join(process.cwd(), 'images.gif');

module.exports = async (req, res) => {
    const { 
        'user-name': userName, 
        'member-count': memberCount, 
        'avatar-url': avatarUrl 
    } = req.query;

    if (!userName || !memberCount || !avatarUrl || isNaN(parseInt(memberCount))) {
        res.status(400).json({ 
            error: 'Eksik parametreler: "user-name", "member-count" ve "avatar-url" gereklidir.' 
        });
        return;
    }
    
    try {
        const backgroundBuffer = fs.readFileSync(BACKGROUND_IMAGE_PATH);
        const background = await Jimp.read(backgroundBuffer);

        const cardWidth = 600;
        const cardHeight = 300;
        background.resize(cardWidth, cardHeight);
        let finalImage = background;

        const avatar = await Jimp.read(avatarUrl);
        const avatarSize = 128;
        avatar.resize(avatarSize, avatarSize);
        
        const mask = await new Jimp(avatarSize, avatarSize, 0x0);
        mask.circle();
        avatar.mask(mask, 0, 0);

        const avatarX = (cardWidth / 2) - (avatarSize / 2);
        const avatarY = 50; 
        finalImage = finalImage.composite(avatar, avatarX, avatarY);

        // Font Yükleme Satırları URL ile Değişti
        const fontBlack = await Jimp.read(FONT_BLACK_URL); 
        const fontWhite = await Jimp.read(FONT_WHITE_URL); 

        // Jimp.read() ile font dosyasını yükledikten sonra, .fnt uzantısını .png olarak değiştirmemiz gerekiyor.
        // Bu yüzden, daha güvenli olan Jimp.loadFont() kullanımına geri dönmek daha iyi.
        // **Fakat fontları URL'den yüklemek Jimp'in default loadFont() metoduyla direkt çalışmaz.**

        // YUKARIDAKİ DİREKT OKUMA YERİNE: İlgili font dosyalarının URL'lerini Jimp.loadFont'a verebiliriz.
        // ANCAK: Jimp'in kendisi bu tür URL'lerden font yüklemeyi desteklemez.
        
        // --- BU DURUMDA, KODU DÜZELTİYORUZ: Jimp font yüklemeyi otomatik yapar, biz sadece Jimp.loadFont(URL) kullanmalıyız. ---
        
        const fontBlackLoaded = await Jimp.loadFont(FONT_BLACK_URL); 
        const fontWhiteLoaded = await Jimp.loadFont(FONT_WHITE_URL); 

        const usernameText = userName;
        const usernameWidth = Jimp.measureText(fontBlackLoaded, usernameText);
        const usernameX = (cardWidth / 2) - (usernameWidth / 2);
        const usernameY = avatarY + avatarSize + 15;
        finalImage.print(fontBlackLoaded, usernameX, usernameY, usernameText);

        const memberText = `Total member: ${memberCount}`;
        const memberWidth = Jimp.measureText(fontWhiteLoaded, memberText);
        const memberX = (cardWidth / 2) - (memberWidth / 2);
        const memberY = usernameY + 40;
        finalImage.print(fontWhiteLoaded, memberX, memberY, memberText);

        const imageBuffer = await finalImage.getBufferAsync(Jimp.MIME_PNG);

        res.writeHead(200, {
            'Content-Type': Jimp.MIME_PNG,
            'Cache-Control': 'max-age=0, no-cache, no-store, must-revalidate'
        });
        res.end(imageBuffer);

    } catch (error) {
        console.error('API Hatası:', error.message);
        res.status(500).json({ 
            error: 'Görsel işleme hatası oluştu: ' + error.message 
        });
    }
};
