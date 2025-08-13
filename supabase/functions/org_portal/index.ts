// supabase/functions/org_portal/index.ts
import { serve } from "serve";
import { createClient } from "supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-org-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

type OrgRow = { id: string; name: string };

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop() || "";
    const supa = createClient(
      Deno.env.get("BLINDADO_SUPABASE_URL")!,
      Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY")!
    );

    async function getOrgByKey(org_key?: string): Promise<OrgRow> {
      if (!org_key) throw new Error("missing org_key");
      const { data, error } = await supa
        .from("organizations")
        .select("id,name")
        .eq("api_key", org_key)
        .single();
      if (error || !data) throw new Error("invalid org_key");
      return data;
    }

    // POST /guards_upsert
    if (req.method === "POST" && path === "guards_upsert") {
      const body = await req.json().catch(() => ({}));
      const org_key: string | undefined = body.org_key;
      const org = org_key ? await getOrgByKey(org_key) : null;

      const first_name = body.first_name ?? "Nombre";
      const last_name = body.last_name ?? "Apellido";
      const email = body.email ?? null;
      const phone = body.phone_e164 ?? null;
      const city = body.city ?? "CDMX";
      const skills = body.skills ?? { armed: false, driver: true };

      const { data: created, error: createErr } = await (supa as any).auth.admin.createUser({
        email: email || undefined,
        phone: phone || undefined,
        email_confirm: !!email,
        phone_confirm: !!phone,
        user_metadata: { first_name, last_name }
      });
      if (createErr) return json({ error: createErr.message }, 500);
      const user_id = created?.user?.id;
      if (!user_id) return json({ error: "failed to create user" }, 500);

      const { error: pErr } = await supa.from("profiles").insert({
        id: user_id,
        role: "guard",
        first_name,
        last_name,
        phone_e164: phone,
        email: email,
        kyc_status: "pending"
      });
      if (pErr) return json({ error: pErr.message }, 500);

      const { error: gErr } = await supa.from("guards").insert({
        id: user_id,
        city,
        skills,
        availability_status: "offline",
        org_id: org ? org.id : null
      });
      if (gErr) return json({ error: gErr.message }, 500);

      return json({ ok: true, guard_id: user_id, org_id: org?.id ?? null });
    }

    // POST /vehicles_upsert
    if (req.method === "POST" && path === "vehicles_upsert") {
      const body = await req.json().catch(() => ({}));
      const org_key: string | undefined = body.org_key;
      const org = org_key ? await getOrgByKey(org_key) : null;

      const owned_by = body.owned_by ?? (org ? "company" : "guard");
      const guard_id = body.guard_id ?? null;
      const type = body.type ?? "suv";
      const armored = !!body.armored;
      const plates = body.plates ?? null;

      const row: any = {
        owned_by,
        guard_id: owned_by === "guard" ? guard_id : null,
        org_id: owned_by === "company" ? (org?.id ?? null) : null,
        type,
        armored,
        plates,
        active: true
      };

      const { data, error } = await supa
        .from("vehicles")
        .insert(row)
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 500);

      return json({ ok: true, vehicle_id: data.id });
    }

    // POST /licenses_create
    if (req.method === "POST" && path === "licenses_create") {
      const body = await req.json().catch(() => ({}));
      const org_key: string | undefined = body.org_key;
      if (org_key) await getOrgByKey(org_key);

      const guard_id = body.guard_id;
      if (!guard_id) return json({ error: "guard_id required" }, 400);

      const payload = {
        guard_id,
        type: body.type ?? "SEDENA",
        issuer: body.issuer ?? null,
        number: body.number ?? null,
        valid_from: body.valid_from ?? null,
        valid_to: body.valid_to ?? null,
        files: [],
        status: "valid"
      };

      const { data, error } = await supa.from("licenses").insert(payload).select("id").single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, license_id: data.id });
    }

    // POST /licenses_upload_base64
    if (req.method === "POST" && path === "licenses_upload_base64") {
      const body = await req.json().catch(() => ({}));
      const org_key: string | undefined = body.org_key;
      const org = org_key ? await getOrgByKey(org_key) : null;

      const license_id = body.license_id;
      const guard_id = body.guard_id;
      const filename = body.filename ?? "doc.jpg";
      const b64 = body.base64 as string;
      const contentType = body.content_type ?? "image/jpeg";
      if (!license_id || !guard_id || !b64) return json({ error: "license_id, guard_id, base64 required" }, 400);

      const base64 = b64.includes(",") ? b64.split(",").pop()! : b64;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const objectPath = `org=${org?.id ?? "freelancers"}/guard=${guard_id}/${crypto.randomUUID()}_${filename}`;

      const { error: upErr } = await supa.storage.from("licenses").upload(objectPath, bytes, {
        contentType,
        upsert: false
      });
      if (upErr) return json({ error: upErr.message }, 500);

      const { data: lic, error: selErr } = await supa
        .from("licenses")
        .select("files")
        .eq("id", license_id)
        .single();
      if (selErr) return json({ error: selErr.message }, 500);

      const files = Array.isArray(lic?.files) ? lic.files : [];
      files.push({ path: objectPath, content_type: contentType, uploaded_at: new Date().toISOString() });

      const { error: updErr } = await supa
        .from("licenses")
        .update({ files })
        .eq("id", license_id);
      if (updErr) return json({ error: updErr.message }, 500);

      return json({ ok: true, path: objectPath });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
