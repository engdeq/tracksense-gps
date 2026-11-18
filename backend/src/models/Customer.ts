import { Schema, model, type InferSchemaType } from 'mongoose';

const customerSchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true },
    address: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

customerSchema.index({ companyName: 'text', contactName: 'text', email: 'text' });
customerSchema.index({ countryId: 1, cityId: 1 });
customerSchema.index({ status: 1 });

export type CustomerDocument = InferSchemaType<typeof customerSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Customer = model('Customer', customerSchema);
