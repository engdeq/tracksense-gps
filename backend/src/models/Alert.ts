import { Schema, model, type InferSchemaType } from 'mongoose';

const alertSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: [
        'speeding',
        'offline',
        'geofence',
        'movement',
        'ignition',
        'system',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

alertSchema.index({ customerId: 1, createdAt: -1 });
alertSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
alertSchema.index({ type: 1 });

export type AlertDocument = InferSchemaType<typeof alertSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Alert = model('Alert', alertSchema);
