import { Schema, model, type InferSchemaType } from 'mongoose';

const deviceProtocolSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    version: { type: String, default: '1.0' },
    description: { type: String, default: '' },
    defaultPort: { type: Number, default: 5027 },
    connectionType: {
      type: String,
      enum: ['tcp', 'udp', 'http', 'mqtt'],
      default: 'tcp',
    },
    /** Backend decoder key — must match an implemented parser to decode GPS frames. */
    decoderKey: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

deviceProtocolSchema.index({ isActive: 1, name: 1 });

export type DeviceProtocolDocument = InferSchemaType<typeof deviceProtocolSchema> & {
  _id: Schema.Types.ObjectId;
};
export const DeviceProtocol = model('DeviceProtocol', deviceProtocolSchema);
