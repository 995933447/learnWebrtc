import Vue from 'vue'
import Router from 'vue-router'
import local from '@/components/local'

Vue.use(Router)

export default new Router({
    mode: 'hash',
    routes: [{
            path: '/',
            name: 'local',
            component: local
        },
        {
            path: '/chatRoom',
            name: 'chatRoom',
            component: r =>
                require.ensure([], () => r(require('@/components/chatRoom')), 'chatRoom'),
        },
        {
            path: '/cropper',
            name: 'cropper',
            component: r =>
                require.ensure([], () => r(require('@/components/cropper')), 'cropper'),
        }
    ]
})