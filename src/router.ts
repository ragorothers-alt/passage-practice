import { createRouter, createWebHashHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 全螢幕畫面，不顯示主選單 */
    bare?: boolean
  }
}

export const router = createRouter({
  // 用 hash 路由，放在任何靜態主機或子路徑下都不需要額外設定
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'today', component: () => import('./views/TodayView.vue') },
    { path: '/pieces', name: 'library', component: () => import('./views/LibraryView.vue') },
    { path: '/pieces/:pieceId', name: 'piece', component: () => import('./views/PieceView.vue'), props: true },
    {
      path: '/pieces/:pieceId/crop/:sourceId',
      name: 'crop',
      component: () => import('./views/CropView.vue'),
      props: true,
      meta: { bare: true },
    },
    {
      path: '/practice/:passageId',
      name: 'practice',
      component: () => import('./views/PracticeView.vue'),
      props: true,
      meta: { bare: true },
    },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
