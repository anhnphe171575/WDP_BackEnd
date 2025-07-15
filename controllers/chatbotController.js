const Product = require('../models/product');
const Category = require('../models/category');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const stringSimilarity = require('string-similarity');
const faqList = require('./faq');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

    // 1. Kiểm tra FAQ dựa trên từ khóa
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
    console.error('Lỗi khi xử lý Gemini:', error);
    res.status(500).json({ reply: 'Lỗi khi xử lý yêu cầu.', error: error.message });
  }
}; 