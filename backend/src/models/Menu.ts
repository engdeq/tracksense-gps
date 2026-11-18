import { Schema, model, type InferSchemaType } from 'mongoose';

const menuSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    icon: { type: String, default: 'Circle' },
    path: { type: String, default: '' },
    parentId: { type: Schema.Types.ObjectId, ref: 'Menu', default: null },
    group: { type: String, default: 'main' },
    order: { type: Number, default: 0 },
    permission: { type: String, default: '' },
    roles: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true },
);

menuSchema.index({ parentId: 1, order: 1 });
menuSchema.index({ isActive: 1, isVisible: 1 });

export type MenuDocument = InferSchemaType<typeof menuSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Menu = model('Menu', menuSchema);
