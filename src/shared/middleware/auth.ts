// import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// export interface AuthRequest extends Request {
//     user?: { id: bigint; role: string };
// }

// export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//         res.status(401).json({ error: 'No token provided' });
//         return;
//     }
//     try {
//         const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
//         req.user = { id: BigInt(decoded.id), role: decoded.role };
//         next();
//     } catch (error) {
//         res.status(401).json({ error: 'Invalid token' });
//     }
// };
//         res.status(401).json({ error: 'Invalid token' });
//     }
// };

export async function getUserIdFromRequest(request: NextRequest): Promise<bigint | null> {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
        return BigInt(decoded.id);
    } catch (error) {
        return null;
    }
}

export async function getUserFromRequest(request: NextRequest): Promise<{ id: bigint; role: string } | null> {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
        return { id: BigInt(decoded.id), role: decoded.role };
    } catch (error) {
        return null;
    }
}
