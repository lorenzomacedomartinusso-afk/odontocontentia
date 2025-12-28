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

        // Atualiza o status da subscription para 'active'
        const { data, error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
            ...(payload.data.subscription?.plan && { plan: payload.data.subscription.plan }),
            ...(payload.data.transaction?.id && { transaction_id: payload.data.transaction.id }),
          })
          .eq("external_id", externalId)
          .select();

        if (error) {
          console.error("Error updating subscription:", error);

          // Se não encontrou, tenta criar uma nova
          if (error.code === "PGRST116" || !data || data.length === 0) {
            console.log("Subscription not found, creating new one");

            const { data: newSub, error: insertError } = await supabase
              .from("subscriptions")
              .insert({
                external_id: externalId,
                status: "active",
                user_email: payload.data.customer?.email,
                plan: payload.data.subscription?.plan || payload.data.product?.name,
                transaction_id: payload.data.transaction?.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select();

            if (insertError) {
              console.error("Error creating subscription:", insertError);
              return new Response(
                JSON.stringify({ error: "Failed to create subscription", details: insertError.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({ success: true, message: "Subscription created", data: newSub }),
              { status: 201, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ error: "Failed to update subscription", details: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
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
