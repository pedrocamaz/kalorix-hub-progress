// Supabase Edge Function: billing-portal
// Nota: este arquivo está aqui apenas para versionamento do código da função.
// Para rodar em produção, crie/cole este conteúdo na Edge Function "billing-portal"
// no Supabase Dashboard e defina as variáveis STRIPE_SECRET_KEY e SERVICE_ROLE_KEY.

// Imports específicos do ambiente de Edge Functions (Deno)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Variáveis de ambiente (aceita ambos os nomes)
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const STRIPE_PORTAL_CONFIG_ID = Deno.env.get("STRIPE_PORTAL_CONFIG_ID"); // OPTIONAL

// Utilitário de CORS
function corsHeaders(req: Request) {
	const origin = req.headers.get("origin") ?? "*";
	return {
		"Vary": "Origin",llow-Origin": origin, // ex.: http://localhost:8080 em dev
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	} as Record<string, string>;rs": "authorization, x-client-info, apikey, content-type",
}} as Record<string, string>;
}
serve(async (req) => {
	const headers = corsHeaders(req);
	const headers = corsHeaders(req);
	if (req.method === "OPTIONS") return new Response("ok", { headers });
	if (req.method !== "POST")S") return new Response("ok", { headers });
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,sponse(JSON.stringify({ error: "Method not allowed" }), {
			headers: { ...headers, "content-type": "application/json" },
		});aders: { ...headers, "content-type": "application/json" },
		});
	// Verificação de envs para evitar "supabaseKey is required"
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
		console.error("Missing envs", {LE_KEY || !STRIPE_SECRET_KEY) {
			has_SUPABASE_URL: !!SUPABASE_URL,
			has_SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY,
			has_STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
		});s_STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
		return new Response(
			JSON.stringify({se(
				error: "Missing required envs",
				has: { "Missing required envs",
					SUPABASE_URL: !!SUPABASE_URL,
					SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY,
					STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
				},TRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
			}),
			{ status: 500, headers: { ...headers, "content-type": "application/json" } }
		); status: 500, headers: { ...headers, "content-type": "application/json" } }
	});
	}
	// Crie o cliente admin e Stripe com as envs garantidas
	const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
	const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
	const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
	try {
		const { phone, return_url } = await req.json().catch(() => ({}));
		if (!phone || !return_url) {= await req.json().catch(() => ({}));
			return new Response(JSON.stringify({ error: "Missing phone/return_url" }), {
				status: 400,sponse(JSON.stringify({ error: "Missing phone/return_url" }), {
				headers: { ...headers, "content-type": "application/json" },
			});aders: { ...headers, "content-type": "application/json" },
		}});
		}
		// Busca usuário pelo telefone (já deve estar normalizado no frontend)
		const { data: user, error: userErr } = await adminalizado no frontend)
			.from("users")ser, error: userErr } = await admin
			.select("id, email, nome, telefone, stripe_customer_id")
			.eq("telefone", phone)me, telefone, stripe_customer_id")
			.maybeSingle(); phone)
			.maybeSingle();
		if (userErr || !user) {
			return new Response(JSON.stringify({ error: "User not found" }), {
				status: 404,sponse(JSON.stringify({ error: "User not found" }), {
				headers: { ...headers, "content-type": "application/json" },
			});aders: { ...headers, "content-type": "application/json" },
		}});
		}
		let customerId = user.stripe_customer_id as string | null;
		let customerId = user.stripe_customer_id as string | null;
		// Cria o customer no Stripe se ainda não existir
		if (!customerId) { no Stripe se ainda não existir
			const customer = await stripe.customers.create({
				email: user.email ?? undefined,stomers.create({
				name: user.nome ?? undefined,d,
				phone: user.telefone ?? undefined,
				metadata: { user_id: user.id, telefone: user.telefone },
			});tadata: { user_id: user.id, telefone: user.telefone },
			customerId = customer.id;
			customerId = customer.id;
			const { error: upErr } = await admin
				.from("users")upErr } = await admin
				.update({ stripe_customer_id: customerId })
				.eq("id", user.id);stomer_id: customerId })
				.eq("id", user.id);
			if (upErr) {
				return new Response(JSON.stringify({ error: "Failed to persist customer id" }), {
					status: 500,sponse(JSON.stringify({ error: "Failed to persist customer id" }), {
					headers: { ...headers, "content-type": "application/json" },
				});aders: { ...headers, "content-type": "application/json" },
			}});
		}}
		}
		// Cria a sessão do Billing Portal
		const params: any = {
			customer: customerId!,
			return_url,ustomerId!,
		};turn_url,
		if (STRIPE_PORTAL_CONFIG_ID) {		};
			params.configuration = STRIPE_PORTAL_CONFIG_ID;
		}
		const session = await stripe.billingPortal.sessions.create(params);
n = await stripe.billingPortal.sessions.create(params);
		return new Response(JSON.stringify({ url: session.url }), {
			headers: { ...headers, "content-type": "application/json" },
		});..headers, "content-type": "application/json" },
	} catch (e) {
		console.error("billing-portal error:", e);tch (e) {
		return new Response(JSON.stringify({ error: String(e) }), {console.error("billing-portal error:", e);
			status: 500,eturn new Response(JSON.stringify({ error: String(e) }), {
			headers: { ...headers, "content-type": "application/json" },			status: 500,
		});...headers, "content-type": "application/json" },
	}
});

// Importante:
// - Nas Settings da função no Supabase, desative "Verify JWT" para esta função.// Importante:




// - SUPABASE_URL é injetada automaticamente, não crie um secret manual com esse nome.// - Defina STRIPE_SECRET_KEY (sk_...) e SERVICE_ROLE_KEY (service_role do projeto).// - Nas Settings da função no Supabase, desative "Verify JWT" para esta função.
// - Defina STRIPE_SECRET_KEY (sk_...) e SERVICE_ROLE_KEY (service_role do projeto).
// - SUPABASE_URL é injetada automaticamente, não crie um secret manual com esse nome.

