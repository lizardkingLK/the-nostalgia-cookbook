import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import mongoose from 'mongoose';
import { User } from '@/models/User';

// MongoDB Atlas connection helper for authentication lifecycle
async function connectDb() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not set. Running NextAuth in transient mode.');
    return;
  }
  try {
    await mongoose.connect(uri, { bufferCommands: false });
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas in NextAuth handler:', err);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          await connectDb();
          if (mongoose.connection.readyState >= 1) {
            // Upsert user into MongoDB Atlas linked by googleId or email
            await User.findOneAndUpdate(
              { email: user.email.toLowerCase() },
              {
                googleId: user.id || account.providerAccountId,
                email: user.email.toLowerCase(),
                name: user.name || 'Family Archivist',
                image: user.image || '',
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          }
          return true;
        } catch (err) {
          console.error('Error upserting user in MongoDB Atlas:', err);
          return true; // Still allow sign in even if DB synchronization fails
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).email = token.email;
        (session.user as any).name = token.name;
        (session.user as any).image = token.picture;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'nostalgia-cookbook-production-secret-key-32chars',
  pages: {
    signIn: '/',
    error: '/',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
