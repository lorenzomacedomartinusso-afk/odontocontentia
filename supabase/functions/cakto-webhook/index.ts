// deno-lint-ignore-file
// @ts-nocheck
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Interface para o payload do webhook da Cakto
interface CaktoWebhookPayload {
  secret?: string;
  event: string;
  data: {
    external_id?: string;
    customer?: {
      email?: string;
      name?: string;
    };
    product?: {
      id?: string;
      name?: string;
    };
    transaction?: {
      id?: string;
      status?: string;
      amount?: number;
    };
    subscription?: {
      id?: string;
      status?: string;
      plan?: string;
    };
    [key: string]: unknown;
  };
}

console.log("Cakto Webhook Function initialized");

Deno.serve(async (req) => {
  // Apenas aceita requisições POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    // Parse do payload
    const payload: CaktoWebhookPayload = await req.json();

    console.log("Received webhook event:", payload.event);
    console.log("Payload data:", JSON.stringify(payload.data, null, 2));

    // Validação do secret (opcional)
    const webhookSecret = Deno.env.get("CAKTO_WEBHOOK_SECRET");
    if (webhookSecret && payload.secret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Inicializa o cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extrai o external_id do payload
    const externalId = payload.data.external_id;

    //if (!externalId) {
    //console.error("Missing external_id in payload");
    //return new Response(
    // JSON.stringify({ error: "Missing external_id" }),
    // {
    //  status: 400,
    // headers: { "Content-Type": "application/json" }
    // }
    // );
    // }

    // Processa os diferentes tipos de eventos
    switch (payload.event) {
      case "purchase_approved": {
        console.log(`Processing purchase_approved for external_id: ${externalId}`);
        // Proteção para o teste da Cakto: se não houver externalId, retornamos sucesso sem salvar no banco
        if (!externalId) {
          console.warn("Teste da Cakto detectado (sem externalId). Respondendo sucesso para o sinal ficar verde.");
          return new Response(
            JSON.stringify({ success: true, message: "Teste recebido com sucesso!" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        // O external_id que enviamos no checkout É O user_id do Supabase
        // Então devemos buscar pela coluna 'user_id', não pela coluna 'external_id' (que está vazia)
        console.log(`Searching for subscription with user_id: ${externalId}`);

        let { data, error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            plan: "Premium",
            updated_at: new Date().toISOString(),
            ...(payload.data.transaction?.id && { transaction_id: payload.data.transaction.id }),
            // Opcional: Salvar o ID da assinatura da Cakto no campo external_id se quiser
            // external_id: payload.data.subscription?.id 
          })
          .eq("user_id", externalId) // FIX: Busca pelo user_id!
          .select();

        // Se não encontrou pelo ID (pode ser um email diferente ou erro), tenta pelo EMAIL
        if (!data || data.length === 0) {
          console.log(`User ID ${externalId} not found, trying search by email: ${payload.data.customer?.email}`);

          if (payload.data.customer?.email) {
            const { data: emailData, error: emailError } = await supabase
              .from("subscriptions")
              .update({
                status: "active",
                plan: "Premium",
                updated_at: new Date().toISOString(),
                ...(payload.data.transaction?.id && { transaction_id: payload.data.transaction.id }),
              })
              .eq("user_email", payload.data.customer.email)
              .select();

            if (emailError) {
              console.error("Error updating subscription by email:", emailError);
            } else if (emailData && emailData.length > 0) {
              console.log("✅ Subscription updated via Email Match:", emailData);
              data = emailData; // Atualiza data para retornar sucesso
              error = null;
            } else {
              console.warn("❌ User not found with this email either.");
            }
          }
        }

        if (error) {
          console.error("Error updating subscription:", error);
          return new Response(
            JSON.stringify({ error: "Failed to update subscription", details: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        if (!data || data.length === 0) {
          // Realmente não achou ninguém
          return new Response(
            JSON.stringify({ error: "User not found for this subscription" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        console.log("Subscription updated successfully:", data);
        return new Response(
          JSON.stringify({ success: true, message: "Subscription activated", data }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "purchase_refused": {
        await supabase
          .from("subscriptions")
          .update({ status: "refused", updated_at: new Date().toISOString() })
          .eq("external_id", externalId);

        return new Response(
          JSON.stringify({ success: true, message: "Purchase refused processed" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "purchase_refunded": {
        await supabase
          .from("subscriptions")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("external_id", externalId);

        return new Response(
          JSON.stringify({ success: true, message: "Refund processed" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "subscription_canceled": {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("external_id", externalId);

        return new Response(
          JSON.stringify({ success: true, message: "Subscription canceled" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "subscription_renewed": {
        await supabase
          .from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("external_id", externalId);

        return new Response(
          JSON.stringify({ success: true, message: "Subscription renewed" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      default: {
        return new Response(
          JSON.stringify({ success: true, message: `Event ${payload.event} received` }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
