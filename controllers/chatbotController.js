const path = require('path');
const dialogflow = require('dialogflow');
const Product = require('../models/product');
const Category = require('../models/category');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const stringSimilarity = require('string-similarity');
const faqList = require('./faq');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Lấy credentials Dialogflow từ file
const credentials = require(path.join(__dirname, '../dialogflow.json'));
const projectId = credentials.project_id;
const sessionClient = new dialogflow.SessionsClient({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
});

// Lấy dữ liệu sản phẩm
async function getProductsData() {
  return await Product.find().populate('category', 'name').lean();
}
// Lấy dữ liệu danh mục
async function getCategoriesData() {
  return await Category.find().lean();
}

const MODEL_CONFIG = {
    model: 'models/gemini-2.0-flash-lite',
    generationConfig: {
      temperature: 0.7, // 0-1, càng cao càng sáng tạo
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 500, // Giới hạn số tokens trong phản hồi
    }
  }

exports.chatWithBot = async (req, res) => {
  try {
    const { messages } = req.body;
    const userMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ reply: 'Chưa cấu hình GEMINI_API_KEY.' });
    }
    if (!userMessage) {
      return res.status(400).json({ reply: 'Không có tin nhắn.' });
    }

    // 1. Thử trả lời bằng Dialogflow trước
    try {
      const sessionId = req.body.sessionId || 'default-session';
      const sessionPath = sessionClient.sessionPath(projectId, sessionId);
      const dfRequest = {
        session: sessionPath,
        queryInput: {
          text: {
            text: userMessage,
            languageCode: 'vi',
          },
        },
      };
      const dfResponses = await sessionClient.detectIntent(dfRequest);
      const dfResult = dfResponses[0].queryResult;
      const fulfillment = dfResult.fulfillmentText && dfResult.fulfillmentText.trim();
      // Chỉ trả về fulfillmentText nếu intent không phải là fallback
      if (
        fulfillment &&
        fulfillment.length > 0 &&
        dfResult.intent &&
        dfResult.intent.displayName !== 'Default Fallback Intent'
      ) {
        return res.json({ reply: fulfillment });
      }
    } catch (dfErr) {
      // Nếu Dialogflow lỗi, bỏ qua và fallback sang Gemini
      console.warn('Dialogflow error, fallback to Gemini:', dfErr.message);
    }

    // 2. Kiểm tra FAQ dựa trên từ khóa
    if (userMessage) {
      const lowerUserMsg = userMessage.toLowerCase();
      for (const faq of faqList) {
        if (faq.keywords && faq.keywords.every(kw => lowerUserMsg.includes(kw))) {
          return res.json({ reply: faq.answer });
        }
      }
    }

    // Lấy dữ liệu từ MongoDB
    const productsData = await getProductsData();
    const categoriesData = await getCategoriesData();

    // Đơn giản hóa dữ liệu cho prompt (giới hạn 5 sản phẩm/danh mục)
    const productsInfo = productsData.slice(0, 5).map(p => ({
      id: p._id.toString(),
      name: p.name,
      category: Array.isArray(p.category) && p.category.length > 0
        ? p.category[0].name
        : 'Không phân loại',
      brand: p.brand || 'Không thương hiệu',
      description: p.description?.substring(0, 100) + '...' || ''
    }));
    const categoriesInfo = categoriesData.slice(0, 5).map(c => ({
      id: c._id.toString(),
      name: c.name,
      description: c.description || ''
    }));

    // System prompt
    const systemPrompt = `
Bạn là trợ lý AI hỗ trợ khách hàng của cửa hàng. 
Hãy trả lời ngắn gọn, thân thiện, hữu ích về các sản phẩm, dịch vụ, cách đặt hàng, vận chuyển, v.v.
Luôn chèn emoji hoặc icon phù hợp với nội dung câu trả lời để tăng sự thân thiện.
Đảm bảo phản hồi của bạn luôn bằng tiếng Việt.

THÔNG TIN SẢN PHẨM:
${JSON.stringify(productsInfo, null, 2)}

DANH MỤC SẢN PHẨM:
${JSON.stringify(categoriesInfo, null, 2)}
`;

    // Kết hợp prompt và lịch sử chat
    const history = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...(messages || []).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))
    ];

    // Gọi Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_CONFIG.model });

    const result = await model.generateContent({
      contents: history,
      generationConfig: MODEL_CONFIG.generationConfig
    });

    const reply = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
      || result?.response?.text
      || 'Xin lỗi, tôi chưa có câu trả lời.';

    res.json({ reply });
  } catch (error) {
    console.error('Lỗi khi xử lý Gemini/Dialogflow:', error);
    res.status(500).json({ reply: 'Lỗi khi xử lý yêu cầu.', error: error.message });
  }
}; 