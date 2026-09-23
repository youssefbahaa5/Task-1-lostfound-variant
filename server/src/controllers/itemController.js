import Joi from 'joi';
import { Item } from '../models/Item.js';

const CATEGORIES = ['electronics', 'clothing', 'documents', 'accessories', 'other'];
const STATUSES = ['lost', 'found', 'claimed'];

const createSchema = Joi.object({
  title: Joi.string().min(1).max(120).required(),
  description: Joi.string().max(1000).allow('').optional(),
  category: Joi.string().valid(...CATEGORIES),
  status: Joi.string().valid(...STATUSES),
  location: Joi.string().max(120).allow('').optional(),
  reportedBy: Joi.string().hex().length(24).optional(),
});


const updateSchema = Joi.object({
  title: Joi.string().min(1).max(120),
  description: Joi.string().max(1000).allow(''),
  category: Joi.string().valid(...CATEGORIES),
  status: Joi.string().valid(...STATUSES),
  location: Joi.string().max(120).allow(''),
  reportedBy: Joi.string().hex().length(24),
});

function publicItem(i) {
  return {
    id: i._id.toString(),
    title: i.title,
    description: i.description,
    category: i.category,
    status: i.status,
    location: i.location,
    // populate() replaces reportedBy with the referenced User doc when
    // requested; fall back to the raw id (or null) when it isn't populated.
    reportedBy:
      i.reportedBy && i.reportedBy.name
        ? { id: i.reportedBy._id.toString(), name: i.reportedBy.name, email: i.reportedBy.email }
        : i.reportedBy?.toString() ?? null,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

// GET /api/items?status=lost&category=electronics
export async function getAllItems(req, res, next) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const items = await Item.find(filter)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: items.map(publicItem) });
  } catch (err) { next(err); }
}

// GET /api/items/:id
export async function getItem(req, res, next) {
  try {
    const item = await Item.findById(req.params.id).populate('reportedBy', 'name email');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ item: publicItem(item) });
  } catch (err) { next(err); }
}

// POST /api/items
export async function createItem(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const item = await Item.create(value);
    res.status(201).json({ item: publicItem(item) });
  } catch (err) {
    // The compound {title, location} index is enforced by MongoDB itself,
    // not checked beforehand — a duplicate shows up here as error code
    // 11000, which we translate into a 409 like the email check in
    // userController.js does.
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An item with this title already exists at this location' });
    }
    next(err);
  }
}

// PATCH /api/items/:id
export async function updateItem(req, res, next) {
  try {
    const { value, error } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const doc = await Item.findByIdAndUpdate(req.params.id, { $set: value }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: 'Item not found' });
    res.json({ item: publicItem(doc) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An item with this title already exists at this location' });
    }
    next(err);
  }
}

// DELETE /api/items/:id
export async function deleteItem(req, res, next) {
  try {
    const doc = await Item.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Item not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
