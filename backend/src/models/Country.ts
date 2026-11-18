import { Schema, model, type InferSchemaType } from 'mongoose';

const countrySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, unique: true, trim: true },
    isoAlpha2: { type: String, required: true, uppercase: true, unique: true, trim: true, maxlength: 2 },
    isoAlpha3: { type: String, required: true, uppercase: true, unique: true, trim: true, maxlength: 3 },
    phoneCode: { type: String, default: '' },
    currencyName: { type: String, default: '' },
    currencyCode: { type: String, default: '', uppercase: true },
    currencySymbol: { type: String, default: '' },
    flagUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

countrySchema.index({ name: 1 });
countrySchema.index({ isActive: 1 });

export type CountryDocument = InferSchemaType<typeof countrySchema> & {
  _id: Schema.Types.ObjectId;
};
export const Country = model('Country', countrySchema);
