import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['electronics', 'clothing', 'documents', 'accessories', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['lost', 'found', 'claimed'],
      default: 'lost',
    },
    location: {
      type: String,
      trim: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// "Same title can't be reported twice at the same location" = a compound
// unique index on {title, location}, not a unique index on title alone.
// That means: "Blue Backpack" lost at the Library and "Blue Backpack" lost
// at the Gym are both allowed (different location), but reporting "Blue
// Backpack" at the Library twice is rejected.
itemSchema.index({ title: 1, location: 1 }, { unique: true });

export const Item = mongoose.model('Item', itemSchema);
