const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/env');

const MEDIA_DIR = path.resolve(__dirname, '../../uploads/complaint_media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

class MediaBufferService {
  /**
   * Downloads an image from an external CDN URL and stores it locally.
   */
  async downloadAndBufferImage(imageUrl, referer = '') {
    try {
      const extMatch = imageUrl.match(/\.(jpeg|jpg|png|webp)/i);
      const ext = extMatch ? extMatch[1] : 'jpg';
      const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
      const filename = `media_${hash}_${Date.now()}.${ext}`;
      const localFilePath = path.join(MEDIA_DIR, filename);

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      if (referer) headers['Referer'] = referer;

      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        headers,
        timeout: 10000
      });

      const writer = fs.createWriteStream(localFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const mimeType = response.headers['content-type'] || `image/${ext}`;

      return {
        success: true,
        originalUrl: imageUrl,
        localPath: `/uploads/complaint_media/${filename}`,
        absolutePath: localFilePath,
        mimeType
      };
    } catch (error) {
      console.warn(`[MediaBuffer] Failed to download image from ${imageUrl}: ${error.message}`);
      return {
        success: false,
        originalUrl: imageUrl,
        error: error.message
      };
    }
  }

  /**
   * Uploads an image binary to Meta WhatsApp Cloud API to obtain a permanent media_id.
   */
  async uploadToWhatsApp(imageBufferInfo) {
    if (!imageBufferInfo.success || !imageBufferInfo.absolutePath) {
      return null;
    }

    // In Mock Mode
    if (config.WHATSAPP.MODE === 'mock') {
      const mockMediaId = `mock_media_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      return {
        wabaMediaId: mockMediaId,
        status: 'UPLOADED_TO_WABA'
      };
    }

    // In Live Meta Mode
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('file', fs.createReadStream(imageBufferInfo.absolutePath), {
        contentType: imageBufferInfo.mimeType
      });
      form.append('type', imageBufferInfo.mimeType);

      const url = `https://graph.facebook.com/${config.WHATSAPP.API_VERSION}/${config.WHATSAPP.PHONE_NUMBER_ID}/media`;
      const response = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${config.WHATSAPP.ACCESS_TOKEN}`
        },
        timeout: 15000
      });

      return {
        wabaMediaId: response.data.id,
        status: 'UPLOADED_TO_WABA'
      };
    } catch (error) {
      console.error('[MediaBuffer] Failed to upload to WhatsApp Cloud API:', error.response?.data || error.message);
      return {
        wabaMediaId: null,
        status: 'FAILED',
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Processes all images for a complaint: downloads and obtains media IDs.
   */
  async processComplaintImages(imageUrls = [], referer = '') {
    const results = [];
    for (const url of imageUrls) {
      const bufferRes = await this.downloadAndBufferImage(url, referer);
      if (bufferRes.success) {
        const uploadRes = await this.uploadToWhatsApp(bufferRes);
        results.push({
          originalUrl: url,
          localPath: bufferRes.localPath,
          mimeType: bufferRes.mimeType,
          wabaMediaId: uploadRes?.wabaMediaId || null,
          status: uploadRes?.status || 'BUFFERED'
        });
      } else {
        results.push({
          originalUrl: url,
          localPath: null,
          mimeType: null,
          wabaMediaId: null,
          status: 'FAILED'
        });
      }
    }
    return results;
  }
}

module.exports = new MediaBufferService();
