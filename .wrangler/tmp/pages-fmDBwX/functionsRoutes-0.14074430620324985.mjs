import { onRequest as __api_admin_comms_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\admin\\comms.js"
import { onRequest as __api_admin_login_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\admin\\login.js"
import { onRequest as __api_admin_logout_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\admin\\logout.js"
import { onRequest as __api_admin_redeploy_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\admin\\redeploy.js"
import { onRequest as __api_admin_refresh_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\admin\\refresh.js"
import { onRequest as __api_admin_stats_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\admin\\stats.js"
import { onRequest as __api_admin_verify_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\admin\\verify.js"
import { onRequest as __api_member_submissions_confirm_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member-submissions\\confirm.js"
import { onRequest as __api_member_submissions_create_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member-submissions\\create.js"
import { onRequest as __api_member_submissions_reject_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member-submissions\\reject.js"
import { onRequest as __api_member_login_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member\\login.js"
import { onRequest as __api_member_logout_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member\\logout.js"
import { onRequest as __api_member_session_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member\\session.js"
import { onRequest as __api_member_verify_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member\\verify.js"
import { onRequest as __api_partners_export_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\partners\\export.js"
import { onRequest as __api_ratings_add_sources_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\ratings\\add-sources.js"
import { onRequest as __api_ratings_list_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\ratings\\list.js"
import { onRequest as __api_ratings_signatory_fix_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\ratings\\signatory-fix.js"
import { onRequest as __api_ratings_update_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\ratings\\update.js"
import { onRequest as __api_recommendations_backfill_sources_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\recommendations\\backfill-sources.js"
import { onRequest as __api_recommendations_confirm_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\recommendations\\confirm.js"
import { onRequest as __api_recommendations_export_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\recommendations\\export.js"
import { onRequest as __api_recommendations_ingest_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\recommendations\\ingest.js"
import { onRequest as __api_recommendations_reject_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\recommendations\\reject.js"
import { onRequest as __api_research_queue_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\research\\queue.js"
import { onRequest as __api_confirm_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\confirm.js"
import { onRequest as __api_current_ratings_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\current-ratings.js"
import { onRequest as __api_latest_member_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\latest-member.js"
import { onRequest as __api_member_counts_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member-counts.js"
import { onRequest as __api_member_details_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member-details.js"
import { onRequest as __api_member_submissions_index_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\member-submissions\\index.js"
import { onRequest as __api_pledge_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\pledge.js"
import { onRequest as __api_recommendations_index_js_onRequest } from "E:\\code\\ASVA\\asva-setup-kit\\functions\\api\\recommendations\\index.js"

export const routes = [
    {
      routePath: "/api/admin/comms",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_comms_js_onRequest],
    },
  {
      routePath: "/api/admin/login",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_login_js_onRequest],
    },
  {
      routePath: "/api/admin/logout",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_logout_js_onRequest],
    },
  {
      routePath: "/api/admin/redeploy",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_redeploy_js_onRequest],
    },
  {
      routePath: "/api/admin/refresh",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_refresh_js_onRequest],
    },
  {
      routePath: "/api/admin/stats",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_stats_js_onRequest],
    },
  {
      routePath: "/api/admin/verify",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_verify_js_onRequest],
    },
  {
      routePath: "/api/member-submissions/confirm",
      mountPath: "/api/member-submissions",
      method: "",
      middlewares: [],
      modules: [__api_member_submissions_confirm_js_onRequest],
    },
  {
      routePath: "/api/member-submissions/create",
      mountPath: "/api/member-submissions",
      method: "",
      middlewares: [],
      modules: [__api_member_submissions_create_js_onRequest],
    },
  {
      routePath: "/api/member-submissions/reject",
      mountPath: "/api/member-submissions",
      method: "",
      middlewares: [],
      modules: [__api_member_submissions_reject_js_onRequest],
    },
  {
      routePath: "/api/member/login",
      mountPath: "/api/member",
      method: "",
      middlewares: [],
      modules: [__api_member_login_js_onRequest],
    },
  {
      routePath: "/api/member/logout",
      mountPath: "/api/member",
      method: "",
      middlewares: [],
      modules: [__api_member_logout_js_onRequest],
    },
  {
      routePath: "/api/member/session",
      mountPath: "/api/member",
      method: "",
      middlewares: [],
      modules: [__api_member_session_js_onRequest],
    },
  {
      routePath: "/api/member/verify",
      mountPath: "/api/member",
      method: "",
      middlewares: [],
      modules: [__api_member_verify_js_onRequest],
    },
  {
      routePath: "/api/partners/export",
      mountPath: "/api/partners",
      method: "",
      middlewares: [],
      modules: [__api_partners_export_js_onRequest],
    },
  {
      routePath: "/api/ratings/add-sources",
      mountPath: "/api/ratings",
      method: "",
      middlewares: [],
      modules: [__api_ratings_add_sources_js_onRequest],
    },
  {
      routePath: "/api/ratings/list",
      mountPath: "/api/ratings",
      method: "",
      middlewares: [],
      modules: [__api_ratings_list_js_onRequest],
    },
  {
      routePath: "/api/ratings/signatory-fix",
      mountPath: "/api/ratings",
      method: "",
      middlewares: [],
      modules: [__api_ratings_signatory_fix_js_onRequest],
    },
  {
      routePath: "/api/ratings/update",
      mountPath: "/api/ratings",
      method: "",
      middlewares: [],
      modules: [__api_ratings_update_js_onRequest],
    },
  {
      routePath: "/api/recommendations/backfill-sources",
      mountPath: "/api/recommendations",
      method: "",
      middlewares: [],
      modules: [__api_recommendations_backfill_sources_js_onRequest],
    },
  {
      routePath: "/api/recommendations/confirm",
      mountPath: "/api/recommendations",
      method: "",
      middlewares: [],
      modules: [__api_recommendations_confirm_js_onRequest],
    },
  {
      routePath: "/api/recommendations/export",
      mountPath: "/api/recommendations",
      method: "",
      middlewares: [],
      modules: [__api_recommendations_export_js_onRequest],
    },
  {
      routePath: "/api/recommendations/ingest",
      mountPath: "/api/recommendations",
      method: "",
      middlewares: [],
      modules: [__api_recommendations_ingest_js_onRequest],
    },
  {
      routePath: "/api/recommendations/reject",
      mountPath: "/api/recommendations",
      method: "",
      middlewares: [],
      modules: [__api_recommendations_reject_js_onRequest],
    },
  {
      routePath: "/api/research/queue",
      mountPath: "/api/research",
      method: "",
      middlewares: [],
      modules: [__api_research_queue_js_onRequest],
    },
  {
      routePath: "/api/confirm",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_confirm_js_onRequest],
    },
  {
      routePath: "/api/current-ratings",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_current_ratings_js_onRequest],
    },
  {
      routePath: "/api/latest-member",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_latest_member_js_onRequest],
    },
  {
      routePath: "/api/member-counts",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_member_counts_js_onRequest],
    },
  {
      routePath: "/api/member-details",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_member_details_js_onRequest],
    },
  {
      routePath: "/api/member-submissions",
      mountPath: "/api/member-submissions",
      method: "",
      middlewares: [],
      modules: [__api_member_submissions_index_js_onRequest],
    },
  {
      routePath: "/api/pledge",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_pledge_js_onRequest],
    },
  {
      routePath: "/api/recommendations",
      mountPath: "/api/recommendations",
      method: "",
      middlewares: [],
      modules: [__api_recommendations_index_js_onRequest],
    },
  ]