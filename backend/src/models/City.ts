import { Schema, model, type InferSchemaType } from 'mongoose';

const citySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    cityCode: { type: String, default: '', trim: true, uppercase: true },
    region: { type: String, default: '' },
    timezone: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

citySchema.index({ countryId: 1, name: 1 }, { unique: true });
citySchema.index({ isActive: 1 });

export type CityDocument = InferSchemaType<typeof citySchema> & {
  _id: Schema.Types.ObjectId;
};
export const City = model('City', citySchema);
