import { Schema, model, type InferSchemaType } from 'mongoose';

const roleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    scope: {
      type: String,
      enum: ['global', 'country', 'city', 'customer', 'assigned'],
      default: 'global',
    },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

roleSchema.index({ isActive: 1, name: 1 });
roleSchema.index({ scope: 1 });

export type RoleDocument = InferSchemaType<typeof roleSchema> & { _id: Schema.Types.ObjectId };
export const Role = model('Role', roleSchema);
