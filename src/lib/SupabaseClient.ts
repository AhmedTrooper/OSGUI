import { createClient } from "@supabase/supabase-js";

const projectUrl = "";
const anonkey = "";
let MySupabaseClient;
try {
  MySupabaseClient = createClient<any>(projectUrl, anonkey);
} catch (error) {
  //   console.log(error);
}
// console.log(MySupabaseClient);
export default MySupabaseClient;
