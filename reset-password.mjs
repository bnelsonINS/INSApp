import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ctvoaqpqovrctpavcgdv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dm9hcXBxb3ZyY3RwYXZjZ2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDExMDEwNSwiZXhwIjoyMDk1Njg2MTA1fQ.xcjfDIAoZZRsP3uDO-_w_rEMhYJQJWS7MW5IXO2JSRc"
);

const userId = "29bcce5b-7bf9-4af2-bbfa-cfa4e4ddfe6c";

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  password: "password!",
});

console.log({ data, error });