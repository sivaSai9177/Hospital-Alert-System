import 'dotenv/config';
import { auth } from "@/lib/auth/auth-server";
import { logger } from '@/lib/core/debug/server-logger';

export async function GET(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Allow-Credentials': 'true',
  };

  try {
    // Get the session using Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    logger.debug('Debug session endpoint called', 'API', {
      hasSession: !!session,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : [],
    });

    if (!session) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No session found',
          debug: {
            cookies: request.headers.get('cookie'),
            authorization: request.headers.get('authorization'),
          }
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return detailed session info for debugging
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          id: session.session?.id,
          userId: session.session?.userId,
          expiresAt: session.session?.expiresAt,
          createdAt: session.session?.createdAt,
        },
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          role: (session.user as any)?.role,
          needsProfileCompletion: (session.user as any)?.needsProfileCompletion,
          organizationId: (session.user as any)?.organizationId,
        },
        debug: {
          rawSession: process.env.NODE_ENV === 'development' ? session : undefined,
          envVars: {
            BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
            DATABASE_URL: !!process.env.DATABASE_URL,
            BETTER_AUTH_BASE_URL: process.env.BETTER_AUTH_BASE_URL,
          }
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    logger.error('Debug session error', 'API', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.stack : undefined) : undefined,
        type: error?.constructor?.name,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export { GET as OPTIONS };