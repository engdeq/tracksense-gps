import { Schema, model, type InferSchemaType } from 'mongoose';

const vehicleIconSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    category: { type: String, default: 'general', trim: true },
    imageUrl: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    vehicleTypeId: { type: Schema.Types.ObjectId, ref: 'VehicleType', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

vehicleIconSchema.index({ category: 1, isActive: 1 });

export type VehicleIconDocument = InferSchemaType<typeof vehicleIconSchema> & {
  _id: Schema.Types.ObjectId;
};
export const VehicleIcon = model('VehicleIcon', vehicleIconSchema);
