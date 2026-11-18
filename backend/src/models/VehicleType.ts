import { Schema, model, type InferSchemaType } from 'mongoose';

const vehicleTypeSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    iconKey: { type: String, default: 'car' },
    defaultIconId: { type: Schema.Types.ObjectId, ref: 'VehicleIcon', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

vehicleTypeSchema.index({ isActive: 1, name: 1 });

export type VehicleTypeDocument = InferSchemaType<typeof vehicleTypeSchema> & {
  _id: Schema.Types.ObjectId;
};
export const VehicleType = model('VehicleType', vehicleTypeSchema);
