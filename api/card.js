const Jimp = require('jimp');
const path = require('path');
const fs = require('fs'); // Vercel'de yerel dosyaları okumak için 'fs' gerekiyor

// Vercel, yerel dosyaları /tmp veya Vercel'in kendi /static dizininde arar.
// En garantili yol, dosyayı projenin köküne koyup fs ile okumaktır.
const BACKGROUND_IMAGE_PATH = path.join(process.cwd(), 'images.gif');

module.exports = async (req, res) => {
    // 1. URL Parametrelerini Çekme (req.query kullanılır)
    const { 
        'user-name': userName, 
        'member-count': memberCount, 
        'avatar-url': avatarUrl 
    } = req.query;

    // Parametre Kontrolü
    if (!userName || !memberCount || !avatarUrl || isNaN(parseInt(memberCount))) {
        res.status(400).json({ 
            error: 'Eksik parametreler: "user-name", "member-count" ve "avatar-url" gereklidir.' 
        });
        return;
    }
    
    try {
        // --- 2. Arkaplanı Yükleme (Dosya Sisteminden Okuma) ---
        // Vercel'de Jimp'e buffer göndermek daha güvenilirdir.
        const backgroundBuffer = fs.readFileSync(BACKGROUND_IMAGE_PATH);
        const background = await Jimp.read(backgroundBuffer);

        const cardWidth = 600;
        const cardHeight = 300;
        background.resize(cardWidth, cardHeight);

        let finalImage = background;

        // --- 3. Avatarı Yükleme, Yuvarlaklaştırma ve Ekleme ---
        const avatar = await Jimp.read(avatarUrl);
        const avatarSize = 128;
        avatar.resize(avatarSize, avatarSize);
        
        const mask = await new Jimp(avatarSize, avatarSize, 0x0);
        mask.circle();
        avatar.mask(mask, 0, 0);

        const avatarX = (cardWidth / 2) - (avatarSize / 2);
        const avatarY = 50; 
        finalImage = finalImage.composite(avatar, avatarX, avatarY);

        // --- 4. Metinleri Ekleme (Fontlar Vercel'de otomatik bulunur) ---
        const fontBlack = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK); 
        const fontWhite = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE); 

        // Kullanıcı Adı
        const usernameText = userName;
        const usernameWidth = Jimp.measureText(fontBlack, usernameText);
        const usernameX = (cardWidth / 2) - (usernameWidth / 2);
        const usernameY = avatarY + avatarSize + 15;
        finalImage.print(fontBlack, usernameX, usernameY, usernameText);

        // Üye Sayısı
        const memberText = `Total member: ${memberCount}`;
        const memberWidth = Jimp.measureText(fontWhite, memberText);
        const memberX = (cardWidth / 2) - (memberWidth / 2);
        const memberY = usernameY + 40;
        finalImage.print(fontWhite, memberX, memberY, memberText);

        // --- 5. Geri Dönüş (PNG) ---
        const imageBuffer = await finalImage.getBufferAsync(Jimp.MIME_PNG);

        // Vercel yanıtı
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
