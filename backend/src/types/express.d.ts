import type { Types } from 'mongoose';

export type AuthRole =
  | 'super_admin'
  | 'admin'
  | 'country_manager'
  | 'city_manager'
  | 'supervisor'
  | 'operator'
  | 'customer';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: AuthRole;
  customerId?: string;
  countryId?: string;
  cityId?: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export type ObjectId = Types.ObjectId;
