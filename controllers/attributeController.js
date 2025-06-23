const Attribute = require('../models/attribute');
const Category = require('../models/category');

// Lấy danh sách attribute, có thể filter theo category hoặc parentId
const getAttributes = async (req, res) => {
  try {
    const { categoryId, parentId } = req.query;
    const filter = {};
    if (categoryId) filter.categories = categoryId;
    if (parentId) filter.parentId = parentId;
    const attributes = await Attribute.find(filter).lean();
    res.status(200).json({ success: true, data: attributes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy chi tiết attribute theo id
const getAttributeById = async (req, res) => {
  try {
    const { id } = req.params;
    const attribute = await Attribute.findById(id).lean();
    if (!attribute) return res.status(404).json({ success: false, message: 'Attribute not found' });
    res.status(200).json({ success: true, data: attribute });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tạo mới attribute
const createAttribute = async (req, res) => {
  try {
    const { value, description, parentId, categories } = req.body;
    if (!value) return res.status(400).json({ success: false, message: 'Value is required' });
    const attr = new Attribute({ value, description, parentId: parentId || null, categories });
    const saved = await attr.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật attribute
const updateAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, description, parentId, categories } = req.body;
    const attr = await Attribute.findById(id);
    if (!attr) return res.status(404).json({ success: false, message: 'Attribute not found' });
    if (value !== undefined) attr.value = value;
    if (description !== undefined) attr.description = description;
    if (parentId !== undefined) attr.parentId = parentId;
    if (categories !== undefined) attr.categories = categories;
    const saved = await attr.save();
    res.status(200).json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Xóa attribute
const deleteAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    // Kiểm tra nếu có attribute con thì không cho xóa
    const hasChild = await Attribute.exists({ parentId: id });
    if (hasChild) return res.status(400).json({ success: false, message: 'Cannot delete attribute with child attributes' });
    await Attribute.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Attribute deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy tree attribute (dạng cây, đệ quy)
const getAttributeTree = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter = { parentId: null };
    if (categoryId) filter.categories = categoryId;
    const buildTree = async (parentId) => {
      const children = await Attribute.find({ parentId: parentId }).lean();
      for (let child of children) {
        child.children = await buildTree(child._id);
      }
      return children;
    };
    const roots = await Attribute.find(filter).lean();
    for (let root of roots) {
      root.children = await buildTree(root._id);
    }
    res.status(200).json({ success: true, data: roots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAttributes,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getAttributeTree
}; 