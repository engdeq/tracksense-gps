import { Schema, model, type InferSchemaType } from 'mongoose';

const appSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true },
);

export type AppSettingsDocument = InferSchemaType<typeof appSettingsSchema> & {
  _id: Schema.Types.ObjectId;
};
export const AppSettings = model('AppSettings', appSettingsSchema);
