const axios = require('axios');
const config = require('../config');

const whatsappAPI = axios.create({
  baseURL: `${config.whatsapp.apiUrl}/${config.whatsapp.apiVersion}`,
  headers: {
    'Authorization': `Bearer ${config.whatsapp.accessToken}`,
    'Content-Type': 'application/json',
  },
});

class WhatsAppService {
  /**
   * Send template message to single recipient
   * @param {string} phoneNumber - Recipient phone with country code (e.g., 6281234567890)
   * @param {string} templateName - Template name from Meta
   * @param {array} parameters - Template variables
   * @returns {Promise<object>} Message response with message ID
   */
  static async sendTemplateMessage(phoneNumber, templateName, parameters = []) {
    try {
      // Normalize phone number
      let phone = phoneNumber.toString();
      if (phone.startsWith('+')) phone = phone.substring(1);
      if (!phone.startsWith('62')) phone = '62' + phone.substring(1);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'id',
          },
        },
      };

      // Add parameters jika ada
      if (parameters && parameters.length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: parameters.map(p => ({ type: 'text', text: String(p) })),
          },
        ];
      }

      const response = await whatsappAPI.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        payload
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        phoneNumber: phone,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`WhatsApp error for ${phoneNumber}:`, error.response?.data || error.message);
      return {
        success: false,
        phoneNumber,
        error: error.response?.data?.error || { message: error.message },
      };
    }
  }

  /**
   * Send simple text message
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message text body
   */
  static async sendTextMessage(phoneNumber, message) {
    try {
      let phone = phoneNumber.toString();
      if (phone.startsWith('+')) phone = phone.substring(1);
      if (!phone.startsWith('62')) phone = '62' + phone.substring(1);

      const response = await whatsappAPI.post(
        `/${config.whatsapp.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get available templates from Meta
   */
  static async getTemplates() {
    try {
      const response = await whatsappAPI.get(
        `/${config.whatsapp.businessAccountId}/message_templates`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching templates:', error.message);
      throw error;
    }
  }

  /**
   * Create message template on Meta
   */
  static async createTemplate(name, category, components, language = 'id') {
    try {
      const response = await whatsappAPI.post(
        `/${config.whatsapp.businessAccountId}/message_templates`,
        {
          name,
          category, // MARKETING, UTILITY, AUTHENTICATION
          components,
          language,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId) {
    try {
      await whatsappAPI.post(`/${messageId}`, { status: 'read' });
    } catch (error) {
      console.error('Error marking message as read:', error.message);
    }
  }

  /**
   * Get media details
   */
  static async getMedia(mediaId) {
    try {
      const response = await whatsappAPI.get(`/${mediaId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch media: ${error.message}`);
    }
  }
}

module.exports = WhatsAppService;
