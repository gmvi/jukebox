package partycast

import (
	"net/http"
	"sync"

	"golang.org/x/net/context"
)

type ContextMap struct {
	lock     sync.Mutex
	contexts map[*http.Request]context.Context
}

func NewContextMap() (cm ContextMap) {
	cm.contexts = make(map[*http.Request]context.Context)
	return
}

func (cm ContextMap) Get(req *http.Request) context.Context {
	cm.lock.Lock()
	defer cm.lock.Unlock()
	if ctx, ok := cm.contexts[req]; ok {
		return ctx
	} else {
		return context.Background()
	}
}

func (cm ContextMap) Put(req *http.Request, ctx context.Context) {
	cm.lock.Lock()
	defer cm.lock.Unlock()
	cm.contexts[req] = ctx
}

// type key int
//
// var pathvarsKey key = 0
//
// func WithPathVars(ctx context.Context, vars map[string]string) context.Context {
// 	return context.WithValue(ctx, pathvarsKey, vars)
// }
//
// func GetPathVars(ctx context.Context) (map[string]string, bool) {
// 	vars, ok := ctx.Value(pathvarsKey).(map[string]string)
// 	return vars, ok
// }
