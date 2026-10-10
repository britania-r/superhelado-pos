// @deno-types="https://deno.land/x/deno@1.30.0/lib.deno.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Crear un cliente de Supabase con la clave de ROL DE SERVICIO.
    // Esta clave permite saltarse RLS y realizar operaciones de administración (como crear usuarios).
    // Se obtiene de las variables de entorno de la Edge Function (secrets set).
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Autenticar y verificar el rol del usuario que llama (el administrador del frontend)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    const token = authHeader.split(' ')[1]

    const { data: userAuth, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !userAuth.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token or user not found' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    // Verificar que el usuario que llama sea un 'admin'
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userAuth.user.id)
      .single()
    
    if (profileError || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Only administrators can create users.' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }

    // 2. Obtener los datos del nuevo usuario del cuerpo de la petición
    const { email, password, full_name, role, store_id } = await req.json()
    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, full_name, role' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    
    // 3. Crear el usuario en auth.users (la tabla de autenticación de Supabase)
    const { data: newUserAuth, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Opcional: El usuario recibirá un correo para confirmar su email
    })

    if (createUserError) {
      return new Response(JSON.stringify({ error: `Error creating auth user: ${createUserError.message}` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 4. Crear el perfil en la tabla 'profiles' (nuestra tabla personalizada)
    const { data: newProfile, error: createProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserAuth.user.id, // Vincula al ID del usuario de auth.users
        full_name,
        role,
        store_id: store_id || null, // store_id es opcional (para admins)
      })
      .select()
      .single()
    
    if (createProfileError) {
      // Si falla la creación del perfil, intentar borrar el usuario de auth.users
      await supabaseAdmin.auth.admin.deleteUser(newUserAuth.user.id)
      return new Response(JSON.stringify({ error: `Failed to create profile: ${createProfileError.message}` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(
      JSON.stringify({ message: 'User created successfully', user: newProfile }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})