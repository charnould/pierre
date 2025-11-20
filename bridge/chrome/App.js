var rW=Object.create;var{getPrototypeOf:nW,defineProperty:Q$,getOwnPropertyNames:oW}=Object;var tW=Object.prototype.hasOwnProperty;var N0=(Q,$,M)=>{M=Q!=null?rW(nW(Q)):{};let A=$||!Q||!Q.__esModule?Q$(M,"default",{value:Q,enumerable:!0}):M;for(let b of oW(Q))if(!tW.call(A,b))Q$(A,b,{get:()=>Q[b],enumerable:!0});return A};var Hw=(Q,$)=>()=>($||Q(($={exports:{}}).exports,$),$.exports);var q5=Hw((eW,Q8)=>{(function(){function Q(J,I){Object.defineProperty(A.prototype,J,{get:function(){console.warn("%s(...) is deprecated in plain JavaScript React classes. %s",I[0],I[1])}})}function $(J){if(J===null||typeof J!=="object")return null;return J=ev&&J[ev]||J["@@iterator"],typeof J==="function"?J:null}function M(J,I){J=(J=J.constructor)&&(J.displayName||J.name)||"ReactClass";var N=J+"."+I;n[N]||(console.error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",I,J),n[N]=!0)}function A(J,I,N){this.props=J,this.context=I,this.refs=q2,this.updater=N||g0}function b(){}function d(J,I,N){this.props=J,this.context=I,this.refs=q2,this.updater=N||g0}function _(){}function O(J){return""+J}function m(J){try{O(J);var I=!1}catch(e){I=!0}if(I){I=console;var N=I.error,c=typeof Symbol==="function"&&Symbol.toStringTag&&J[Symbol.toStringTag]||J.constructor.name||"Object";return N.call(I,"The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",c),O(J)}}function r(J){if(J==null)return null;if(typeof J==="function")return J.$$typeof===J4?null:J.displayName||J.name||null;if(typeof J==="string")return J;switch(J){case o:return"Fragment";case a:return"Profiler";case V:return"StrictMode";case s0:return"Suspense";case E0:return"SuspenseList";case o2:return"Activity"}if(typeof J==="object")switch(typeof J.tag==="number"&&console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."),J.$$typeof){case t:return"Portal";case p:return J.displayName||"Context";case v0:return(J._context.displayName||"Context")+".Consumer";case U0:var I=J.render;return J=J.displayName,J||(J=I.displayName||I.name||"",J=J!==""?"ForwardRef("+J+")":"ForwardRef"),J;case yw:return I=J.displayName||null,I!==null?I:r(J.type)||"Memo";case z2:I=J._payload,J=J._init;try{return r(J(I))}catch(N){}}return null}function P(J){if(J===o)return"<>";if(typeof J==="object"&&J!==null&&J.$$typeof===z2)return"<...>";try{var I=r(J);return I?"<"+I+">":"<...>"}catch(N){return"<...>"}}function j(){var J=M0.A;return J===null?null:J.getOwner()}function E(){return Error("react-stack-top-frame")}function X0(J){if(wg.call(J,"key")){var I=Object.getOwnPropertyDescriptor(J,"key").get;if(I&&I.isReactWarning)return!1}return J.key!==void 0}function Q0(J,I){function N(){nx||(nx=!0,console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",I))}N.isReactWarning=!0,Object.defineProperty(J,"key",{get:N,configurable:!0})}function K0(){var J=r(this.type);return Bv[J]||(Bv[J]=!0,console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.")),J=this.props.ref,J!==void 0?J:null}function f0(J,I,N,c,e,$0){var q0=N.ref;return J={$$typeof:S,type:J,key:I,props:N,_owner:c},(q0!==void 0?q0:null)!==null?Object.defineProperty(J,"ref",{enumerable:!1,get:K0}):Object.defineProperty(J,"ref",{enumerable:!1,value:null}),J._store={},Object.defineProperty(J._store,"validated",{configurable:!1,enumerable:!1,writable:!0,value:0}),Object.defineProperty(J,"_debugInfo",{configurable:!1,enumerable:!1,writable:!0,value:null}),Object.defineProperty(J,"_debugStack",{configurable:!1,enumerable:!1,writable:!0,value:e}),Object.defineProperty(J,"_debugTask",{configurable:!1,enumerable:!1,writable:!0,value:$0}),Object.freeze&&(Object.freeze(J.props),Object.freeze(J)),J}function Aw(J,I){return I=f0(J.type,I,J.props,J._owner,J._debugStack,J._debugTask),J._store&&(I._store.validated=J._store.validated),I}function Cw(J){$w(J)?J._store&&(J._store.validated=1):typeof J==="object"&&J!==null&&J.$$typeof===z2&&(J._payload.status==="fulfilled"?$w(J._payload.value)&&J._payload.value._store&&(J._payload.value._store.validated=1):J._store&&(J._store.validated=1))}function $w(J){return typeof J==="object"&&J!==null&&J.$$typeof===S}function c0(J){var I={"=":"=0",":":"=2"};return"$"+J.replace(/[=:]/g,function(N){return I[N]})}function x2(J,I){return typeof J==="object"&&J!==null&&J.key!=null?(m(J.key),c0(""+J.key)):I.toString(36)}function $2(J){switch(J.status){case"fulfilled":return J.value;case"rejected":throw J.reason;default:switch(typeof J.status==="string"?J.then(_,_):(J.status="pending",J.then(function(I){J.status==="pending"&&(J.status="fulfilled",J.value=I)},function(I){J.status==="pending"&&(J.status="rejected",J.reason=I)})),J.status){case"fulfilled":return J.value;case"rejected":throw J.reason}}throw J}function o0(J,I,N,c,e){var $0=typeof J;if($0==="undefined"||$0==="boolean")J=null;var q0=!1;if(J===null)q0=!0;else switch($0){case"bigint":case"string":case"number":q0=!0;break;case"object":switch(J.$$typeof){case S:case t:q0=!0;break;case z2:return q0=J._init,o0(q0(J._payload),I,N,c,e)}}if(q0){q0=J,e=e(q0);var C0=c===""?"."+x2(q0,0):c;return u0(e)?(N="",C0!=null&&(N=C0.replace(gg,"$&/")+"/"),o0(e,I,N,"",function(dw){return dw})):e!=null&&($w(e)&&(e.key!=null&&(q0&&q0.key===e.key||m(e.key)),N=Aw(e,N+(e.key==null||q0&&q0.key===e.key?"":(""+e.key).replace(gg,"$&/")+"/")+C0),c!==""&&q0!=null&&$w(q0)&&q0.key==null&&q0._store&&!q0._store.validated&&(N._store.validated=2),e=N),I.push(e)),1}if(q0=0,C0=c===""?".":c+":",u0(J))for(var z0=0;z0<J.length;z0++)c=J[z0],$0=C0+x2(c,z0),q0+=o0(c,I,N,$0,e);else if(z0=$(J),typeof z0==="function")for(z0===J.entries&&(vg||console.warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead."),vg=!0),J=z0.call(J),z0=0;!(c=J.next()).done;)c=c.value,$0=C0+x2(c,z0++),q0+=o0(c,I,N,$0,e);else if($0==="object"){if(typeof J.then==="function")return o0($2(J),I,N,c,e);throw I=String(J),Error("Objects are not valid as a React child (found: "+(I==="[object Object]"?"object with keys {"+Object.keys(J).join(", ")+"}":I)+"). If you meant to render a collection of children, use an array instead.")}return q0}function b0(J,I,N){if(J==null)return J;var c=[],e=0;return o0(J,c,"","",function($0){return I.call(N,$0,e++)}),c}function Zw(J){if(J._status===-1){var I=J._ioInfo;I!=null&&(I.start=I.end=performance.now()),I=J._result;var N=I();if(N.then(function(e){if(J._status===0||J._status===-1){J._status=1,J._result=e;var $0=J._ioInfo;$0!=null&&($0.end=performance.now()),N.status===void 0&&(N.status="fulfilled",N.value=e)}},function(e){if(J._status===0||J._status===-1){J._status=2,J._result=e;var $0=J._ioInfo;$0!=null&&($0.end=performance.now()),N.status===void 0&&(N.status="rejected",N.reason=e)}}),I=J._ioInfo,I!=null){I.value=N;var c=N.displayName;typeof c==="string"&&(I.name=c)}J._status===-1&&(J._status=0,J._result=N)}if(J._status===1)return I=J._result,I===void 0&&console.error(`lazy: Expected the result of a dynamic import() call. Instead received: %s

Your code should look like: 
  const MyComponent = lazy(() => import('./MyComponent'))

Did you accidentally put curly braces around the import?`,I),"default"in I||console.error(`lazy: Expected the result of a dynamic import() call. Instead received: %s

Your code should look like: 
  const MyComponent = lazy(() => import('./MyComponent'))`,I),I.default;throw J._result}function l(){var J=M0.H;return J===null&&console.error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`),J}function xw(){M0.asyncTransitions--}function k0(J){if(Hv===null)try{var I=("require"+Math.random()).slice(0,7);Hv=(Q8&&Q8[I]).call(Q8,"timers").setImmediate}catch(N){Hv=function(c){ox===!1&&(ox=!0,typeof MessageChannel>"u"&&console.error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."));var e=new MessageChannel;e.port1.onmessage=c,e.port2.postMessage(void 0)}}return Hv(J)}function h(J){return 1<J.length&&typeof AggregateError==="function"?AggregateError(J):J[0]}function y(J,I){I!==Jv-1&&console.error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "),Jv=I}function C(J,I,N){var c=M0.actQueue;if(c!==null)if(c.length!==0)try{T(c),k0(function(){return C(J,I,N)});return}catch(e){M0.thrownErrors.push(e)}else M0.actQueue=null;0<M0.thrownErrors.length?(c=h(M0.thrownErrors),M0.thrownErrors.length=0,N(c)):I(J)}function T(J){if(!$v){$v=!0;var I=0;try{for(;I<J.length;I++){var N=J[I];do{M0.didUsePromise=!1;var c=N(!1);if(c!==null){if(M0.didUsePromise){J[I]=N,J.splice(0,I);return}N=c}else break}while(1)}J.length=0}catch(e){J.splice(0,I+1),M0.thrownErrors.push(e)}finally{$v=!1}}}typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart==="function"&&__REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());var S=Symbol.for("react.transitional.element"),t=Symbol.for("react.portal"),o=Symbol.for("react.fragment"),V=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),v0=Symbol.for("react.consumer"),p=Symbol.for("react.context"),U0=Symbol.for("react.forward_ref"),s0=Symbol.for("react.suspense"),E0=Symbol.for("react.suspense_list"),yw=Symbol.for("react.memo"),z2=Symbol.for("react.lazy"),o2=Symbol.for("react.activity"),ev=Symbol.iterator,n={},g0={isMounted:function(){return!1},enqueueForceUpdate:function(J){M(J,"forceUpdate")},enqueueReplaceState:function(J){M(J,"replaceState")},enqueueSetState:function(J){M(J,"setState")}},t2=Object.assign,q2={};Object.freeze(q2),A.prototype.isReactComponent={},A.prototype.setState=function(J,I){if(typeof J!=="object"&&typeof J!=="function"&&J!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,J,I,"setState")},A.prototype.forceUpdate=function(J){this.updater.enqueueForceUpdate(this,J,"forceUpdate")};var qw={isMounted:["isMounted","Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],replaceState:["replaceState","Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]};for(K5 in qw)qw.hasOwnProperty(K5)&&Q(K5,qw[K5]);b.prototype=A.prototype,qw=d.prototype=new b,qw.constructor=d,t2(qw,A.prototype),qw.isPureReactComponent=!0;var u0=Array.isArray,J4=Symbol.for("react.client.reference"),M0={H:null,A:null,T:null,S:null,actQueue:null,asyncTransitions:0,isBatchingLegacy:!1,didScheduleLegacyUpdate:!1,didUsePromise:!1,thrownErrors:[],getCurrentStack:null,recentlyCreatedOwnerStacks:0},wg=Object.prototype.hasOwnProperty,i0=console.createTask?console.createTask:function(){return null};qw={react_stack_bottom_frame:function(J){return J()}};var nx,$1,Bv={},Xv=qw.react_stack_bottom_frame.bind(qw,E)(),b8=i0(P(E)),vg=!1,gg=/\/+/g,U5=typeof reportError==="function"?reportError:function(J){if(typeof window==="object"&&typeof window.ErrorEvent==="function"){var I=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof J==="object"&&J!==null&&typeof J.message==="string"?String(J.message):String(J),error:J});if(!window.dispatchEvent(I))return}else if(typeof process==="object"&&typeof process.emit==="function"){process.emit("uncaughtException",J);return}console.error(J)},ox=!1,Hv=null,Jv=0,Qv=!1,$v=!1,Q4=typeof queueMicrotask==="function"?function(J){queueMicrotask(function(){return queueMicrotask(J)})}:k0;qw=Object.freeze({__proto__:null,c:function(J){return l().useMemoCache(J)}});var K5={map:b0,forEach:function(J,I,N){b0(J,function(){I.apply(this,arguments)},N)},count:function(J){var I=0;return b0(J,function(){I++}),I},toArray:function(J){return b0(J,function(I){return I})||[]},only:function(J){if(!$w(J))throw Error("React.Children.only expected to receive a single React element child.");return J}};eW.Activity=o2,eW.Children=K5,eW.Component=A,eW.Fragment=o,eW.Profiler=a,eW.PureComponent=d,eW.StrictMode=V,eW.Suspense=s0,eW.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=M0,eW.__COMPILER_RUNTIME=qw,eW.act=function(J){var I=M0.actQueue,N=Jv;Jv++;var c=M0.actQueue=I!==null?I:[],e=!1;try{var $0=J()}catch(z0){M0.thrownErrors.push(z0)}if(0<M0.thrownErrors.length)throw y(I,N),J=h(M0.thrownErrors),M0.thrownErrors.length=0,J;if($0!==null&&typeof $0==="object"&&typeof $0.then==="function"){var q0=$0;return Q4(function(){e||Qv||(Qv=!0,console.error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"))}),{then:function(z0,dw){e=!0,q0.then(function(U2){if(y(I,N),N===0){try{T(c),k0(function(){return C(U2,z0,dw)})}catch($4){M0.thrownErrors.push($4)}if(0<M0.thrownErrors.length){var W5=h(M0.thrownErrors);M0.thrownErrors.length=0,dw(W5)}}else z0(U2)},function(U2){y(I,N),0<M0.thrownErrors.length?(U2=h(M0.thrownErrors),M0.thrownErrors.length=0,dw(U2)):dw(U2)})}}}var C0=$0;if(y(I,N),N===0&&(T(c),c.length!==0&&Q4(function(){e||Qv||(Qv=!0,console.error("A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"))}),M0.actQueue=null),0<M0.thrownErrors.length)throw J=h(M0.thrownErrors),M0.thrownErrors.length=0,J;return{then:function(z0,dw){e=!0,N===0?(M0.actQueue=c,k0(function(){return C(C0,z0,dw)})):z0(C0)}}},eW.cache=function(J){return function(){return J.apply(null,arguments)}},eW.cacheSignal=function(){return null},eW.captureOwnerStack=function(){var J=M0.getCurrentStack;return J===null?null:J()},eW.cloneElement=function(J,I,N){if(J===null||J===void 0)throw Error("The argument must be a React element, but you passed "+J+".");var c=t2({},J.props),e=J.key,$0=J._owner;if(I!=null){var q0;w:{if(wg.call(I,"ref")&&(q0=Object.getOwnPropertyDescriptor(I,"ref").get)&&q0.isReactWarning){q0=!1;break w}q0=I.ref!==void 0}q0&&($0=j()),X0(I)&&(m(I.key),e=""+I.key);for(C0 in I)!wg.call(I,C0)||C0==="key"||C0==="__self"||C0==="__source"||C0==="ref"&&I.ref===void 0||(c[C0]=I[C0])}var C0=arguments.length-2;if(C0===1)c.children=N;else if(1<C0){q0=Array(C0);for(var z0=0;z0<C0;z0++)q0[z0]=arguments[z0+2];c.children=q0}c=f0(J.type,e,c,$0,J._debugStack,J._debugTask);for(e=2;e<arguments.length;e++)Cw(arguments[e]);return c},eW.createContext=function(J){return J={$$typeof:p,_currentValue:J,_currentValue2:J,_threadCount:0,Provider:null,Consumer:null},J.Provider=J,J.Consumer={$$typeof:v0,_context:J},J._currentRenderer=null,J._currentRenderer2=null,J},eW.createElement=function(J,I,N){for(var c=2;c<arguments.length;c++)Cw(arguments[c]);c={};var e=null;if(I!=null)for(z0 in $1||!("__self"in I)||"key"in I||($1=!0,console.warn("Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform")),X0(I)&&(m(I.key),e=""+I.key),I)wg.call(I,z0)&&z0!=="key"&&z0!=="__self"&&z0!=="__source"&&(c[z0]=I[z0]);var $0=arguments.length-2;if($0===1)c.children=N;else if(1<$0){for(var q0=Array($0),C0=0;C0<$0;C0++)q0[C0]=arguments[C0+2];Object.freeze&&Object.freeze(q0),c.children=q0}if(J&&J.defaultProps)for(z0 in $0=J.defaultProps,$0)c[z0]===void 0&&(c[z0]=$0[z0]);e&&Q0(c,typeof J==="function"?J.displayName||J.name||"Unknown":J);var z0=1e4>M0.recentlyCreatedOwnerStacks++;return f0(J,e,c,j(),z0?Error("react-stack-top-frame"):Xv,z0?i0(P(J)):b8)},eW.createRef=function(){var J={current:null};return Object.seal(J),J},eW.forwardRef=function(J){J!=null&&J.$$typeof===yw?console.error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."):typeof J!=="function"?console.error("forwardRef requires a render function but was given %s.",J===null?"null":typeof J):J.length!==0&&J.length!==2&&console.error("forwardRef render functions accept exactly two parameters: props and ref. %s",J.length===1?"Did you forget to use the ref parameter?":"Any additional parameter will be undefined."),J!=null&&J.defaultProps!=null&&console.error("forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?");var I={$$typeof:U0,render:J},N;return Object.defineProperty(I,"displayName",{enumerable:!1,configurable:!0,get:function(){return N},set:function(c){N=c,J.name||J.displayName||(Object.defineProperty(J,"name",{value:c}),J.displayName=c)}}),I},eW.isValidElement=$w,eW.lazy=function(J){J={_status:-1,_result:J};var I={$$typeof:z2,_payload:J,_init:Zw},N={name:"lazy",start:-1,end:-1,value:null,owner:null,debugStack:Error("react-stack-top-frame"),debugTask:console.createTask?console.createTask("lazy()"):null};return J._ioInfo=N,I._debugInfo=[{awaited:N}],I},eW.memo=function(J,I){J==null&&console.error("memo: The first argument must be a component. Instead received: %s",J===null?"null":typeof J),I={$$typeof:yw,type:J,compare:I===void 0?null:I};var N;return Object.defineProperty(I,"displayName",{enumerable:!1,configurable:!0,get:function(){return N},set:function(c){N=c,J.name||J.displayName||(Object.defineProperty(J,"name",{value:c}),J.displayName=c)}}),I},eW.startTransition=function(J){var I=M0.T,N={};N._updatedFibers=new Set,M0.T=N;try{var c=J(),e=M0.S;e!==null&&e(N,c),typeof c==="object"&&c!==null&&typeof c.then==="function"&&(M0.asyncTransitions++,c.then(xw,xw),c.then(_,U5))}catch($0){U5($0)}finally{I===null&&N._updatedFibers&&(J=N._updatedFibers.size,N._updatedFibers.clear(),10<J&&console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.")),I!==null&&N.types!==null&&(I.types!==null&&I.types!==N.types&&console.error("We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."),I.types=N.types),M0.T=I}},eW.unstable_useCacheRefresh=function(){return l().useCacheRefresh()},eW.use=function(J){return l().use(J)},eW.useActionState=function(J,I,N){return l().useActionState(J,I,N)},eW.useCallback=function(J,I){return l().useCallback(J,I)},eW.useContext=function(J){var I=l();return J.$$typeof===v0&&console.error("Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"),I.useContext(J)},eW.useDebugValue=function(J,I){return l().useDebugValue(J,I)},eW.useDeferredValue=function(J,I){return l().useDeferredValue(J,I)},eW.useEffect=function(J,I){return J==null&&console.warn("React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"),l().useEffect(J,I)},eW.useEffectEvent=function(J){return l().useEffectEvent(J)},eW.useId=function(){return l().useId()},eW.useImperativeHandle=function(J,I,N){return l().useImperativeHandle(J,I,N)},eW.useInsertionEffect=function(J,I){return J==null&&console.warn("React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"),l().useInsertionEffect(J,I)},eW.useLayoutEffect=function(J,I){return J==null&&console.warn("React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"),l().useLayoutEffect(J,I)},eW.useMemo=function(J,I){return l().useMemo(J,I)},eW.useOptimistic=function(J,I){return l().useOptimistic(J,I)},eW.useReducer=function(J,I,N){return l().useReducer(J,I,N)},eW.useRef=function(J){return l().useRef(J)},eW.useState=function(J){return l().useState(J)},eW.useSyncExternalStore=function(J,I,N){return l().useSyncExternalStore(J,I,N)},eW.useTransition=function(){return l().useTransition()},eW.version="19.2.0",typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop==="function"&&__REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error())})()});var q$=Hw((wM)=>{(function(){function Q(){if(c0=!1,b0){var C=wM.unstable_now();xw=C;var T=!0;try{w:{Cw=!1,$w&&($w=!1,$2(Zw),Zw=-1),Aw=!0;var S=f0;try{v:{d(C);for(K0=M(E);K0!==null&&!(K0.expirationTime>C&&O());){var t=K0.callback;if(typeof t==="function"){K0.callback=null,f0=K0.priorityLevel;var o=t(K0.expirationTime<=C);if(C=wM.unstable_now(),typeof o==="function"){K0.callback=o,d(C),T=!0;break v}K0===M(E)&&A(E),d(C)}else A(E);K0=M(E)}if(K0!==null)T=!0;else{var V=M(X0);V!==null&&m(_,V.startTime-C),T=!1}}break w}finally{K0=null,f0=S,Aw=!1}T=void 0}}finally{T?k0():b0=!1}}}function $(C,T){var S=C.length;C.push(T);w:for(;0<S;){var t=S-1>>>1,o=C[t];if(0<b(o,T))C[t]=T,C[S]=o,S=t;else break w}}function M(C){return C.length===0?null:C[0]}function A(C){if(C.length===0)return null;var T=C[0],S=C.pop();if(S!==T){C[0]=S;w:for(var t=0,o=C.length,V=o>>>1;t<V;){var a=2*(t+1)-1,v0=C[a],p=a+1,U0=C[p];if(0>b(v0,S))p<o&&0>b(U0,v0)?(C[t]=U0,C[p]=S,t=p):(C[t]=v0,C[a]=S,t=a);else if(p<o&&0>b(U0,S))C[t]=U0,C[p]=S,t=p;else break w}}return T}function b(C,T){var S=C.sortIndex-T.sortIndex;return S!==0?S:C.id-T.id}function d(C){for(var T=M(X0);T!==null;){if(T.callback===null)A(X0);else if(T.startTime<=C)A(X0),T.sortIndex=T.expirationTime,$(E,T);else break;T=M(X0)}}function _(C){if($w=!1,d(C),!Cw)if(M(E)!==null)Cw=!0,b0||(b0=!0,k0());else{var T=M(X0);T!==null&&m(_,T.startTime-C)}}function O(){return c0?!0:wM.unstable_now()-xw<l?!1:!0}function m(C,T){Zw=x2(function(){C(wM.unstable_now())},T)}if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart==="function"&&__REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error()),wM.unstable_now=void 0,typeof performance==="object"&&typeof performance.now==="function"){var r=performance;wM.unstable_now=function(){return r.now()}}else{var P=Date,j=P.now();wM.unstable_now=function(){return P.now()-j}}var E=[],X0=[],Q0=1,K0=null,f0=3,Aw=!1,Cw=!1,$w=!1,c0=!1,x2=typeof setTimeout==="function"?setTimeout:null,$2=typeof clearTimeout==="function"?clearTimeout:null,o0=typeof setImmediate<"u"?setImmediate:null,b0=!1,Zw=-1,l=5,xw=-1;if(typeof o0==="function")var k0=function(){o0(Q)};else if(typeof MessageChannel<"u"){var h=new MessageChannel,y=h.port2;h.port1.onmessage=Q,k0=function(){y.postMessage(null)}}else k0=function(){x2(Q,0)};wM.unstable_IdlePriority=5,wM.unstable_ImmediatePriority=1,wM.unstable_LowPriority=4,wM.unstable_NormalPriority=3,wM.unstable_Profiling=null,wM.unstable_UserBlockingPriority=2,wM.unstable_cancelCallback=function(C){C.callback=null},wM.unstable_forceFrameRate=function(C){0>C||125<C?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):l=0<C?Math.floor(1000/C):5},wM.unstable_getCurrentPriorityLevel=function(){return f0},wM.unstable_next=function(C){switch(f0){case 1:case 2:case 3:var T=3;break;default:T=f0}var S=f0;f0=T;try{return C()}finally{f0=S}},wM.unstable_requestPaint=function(){c0=!0},wM.unstable_runWithPriority=function(C,T){switch(C){case 1:case 2:case 3:case 4:case 5:break;default:C=3}var S=f0;f0=C;try{return T()}finally{f0=S}},wM.unstable_scheduleCallback=function(C,T,S){var t=wM.unstable_now();switch(typeof S==="object"&&S!==null?(S=S.delay,S=typeof S==="number"&&0<S?t+S:t):S=t,C){case 1:var o=-1;break;case 2:o=250;break;case 5:o=1073741823;break;case 4:o=1e4;break;default:o=5000}return o=S+o,C={id:Q0++,callback:T,priorityLevel:C,startTime:S,expirationTime:o,sortIndex:-1},S>t?(C.sortIndex=S,$(X0,C),M(E)===null&&C===M(X0)&&($w?($2(Zw),Zw=-1):$w=!0,m(_,S-t))):(C.sortIndex=o,$(E,C),Cw||Aw||(Cw=!0,b0||(b0=!0,k0()))),C},wM.unstable_shouldYield=O,wM.unstable_wrapCallback=function(C){var T=f0;return function(){var S=f0;f0=T;try{return C.apply(this,arguments)}finally{f0=S}}},typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop==="function"&&__REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error())})()});var U$=Hw((vM)=>{var vG=N0(q5());(function(){function Q(){}function $(P){return""+P}function M(P,j,E){var X0=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;try{$(X0);var Q0=!1}catch(K0){Q0=!0}return Q0&&(console.error("The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",typeof Symbol==="function"&&Symbol.toStringTag&&X0[Symbol.toStringTag]||X0.constructor.name||"Object"),$(X0)),{$$typeof:m,key:X0==null?null:""+X0,children:P,containerInfo:j,implementation:E}}function A(P,j){if(P==="font")return"";if(typeof j==="string")return j==="use-credentials"?j:""}function b(P){return P===null?"`null`":P===void 0?"`undefined`":P===""?"an empty string":'something with type "'+typeof P+'"'}function d(P){return P===null?"`null`":P===void 0?"`undefined`":P===""?"an empty string":typeof P==="string"?JSON.stringify(P):typeof P==="number"?"`"+P+"`":'something with type "'+typeof P+'"'}function _(){var P=r.H;return P===null&&console.error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`),P}typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart==="function"&&__REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());var O={d:{f:Q,r:function(){throw Error("Invalid form element. requestFormReset must be passed a form that was rendered by React.")},D:Q,C:Q,L:Q,m:Q,X:Q,S:Q,M:Q},p:0,findDOMNode:null},m=Symbol.for("react.portal"),r=vG.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;typeof Map==="function"&&Map.prototype!=null&&typeof Map.prototype.forEach==="function"&&typeof Set==="function"&&Set.prototype!=null&&typeof Set.prototype.clear==="function"&&typeof Set.prototype.forEach==="function"||console.error("React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"),vM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=O,vM.createPortal=function(P,j){var E=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!j||j.nodeType!==1&&j.nodeType!==9&&j.nodeType!==11)throw Error("Target container is not a DOM element.");return M(P,j,null,E)},vM.flushSync=function(P){var j=r.T,E=O.p;try{if(r.T=null,O.p=2,P)return P()}finally{r.T=j,O.p=E,O.d.f()&&console.error("flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task.")}},vM.preconnect=function(P,j){typeof P==="string"&&P?j!=null&&typeof j!=="object"?console.error("ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",d(j)):j!=null&&typeof j.crossOrigin!=="string"&&console.error("ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",b(j.crossOrigin)):console.error("ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",b(P)),typeof P==="string"&&(j?(j=j.crossOrigin,j=typeof j==="string"?j==="use-credentials"?j:"":void 0):j=null,O.d.C(P,j))},vM.prefetchDNS=function(P){if(typeof P!=="string"||!P)console.error("ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",b(P));else if(1<arguments.length){var j=arguments[1];typeof j==="object"&&j.hasOwnProperty("crossOrigin")?console.error("ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",d(j)):console.error("ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",d(j))}typeof P==="string"&&O.d.D(P)},vM.preinit=function(P,j){if(typeof P==="string"&&P?j==null||typeof j!=="object"?console.error("ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",d(j)):j.as!=="style"&&j.as!=="script"&&console.error('ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',d(j.as)):console.error("ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",b(P)),typeof P==="string"&&j&&typeof j.as==="string"){var E=j.as,X0=A(E,j.crossOrigin),Q0=typeof j.integrity==="string"?j.integrity:void 0,K0=typeof j.fetchPriority==="string"?j.fetchPriority:void 0;E==="style"?O.d.S(P,typeof j.precedence==="string"?j.precedence:void 0,{crossOrigin:X0,integrity:Q0,fetchPriority:K0}):E==="script"&&O.d.X(P,{crossOrigin:X0,integrity:Q0,fetchPriority:K0,nonce:typeof j.nonce==="string"?j.nonce:void 0})}},vM.preinitModule=function(P,j){var E="";if(typeof P==="string"&&P||(E+=" The `href` argument encountered was "+b(P)+"."),j!==void 0&&typeof j!=="object"?E+=" The `options` argument encountered was "+b(j)+".":j&&("as"in j)&&j.as!=="script"&&(E+=" The `as` option encountered was "+d(j.as)+"."),E)console.error("ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",E);else switch(E=j&&typeof j.as==="string"?j.as:"script",E){case"script":break;default:E=d(E),console.error('ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',E,P)}if(typeof P==="string")if(typeof j==="object"&&j!==null){if(j.as==null||j.as==="script")E=A(j.as,j.crossOrigin),O.d.M(P,{crossOrigin:E,integrity:typeof j.integrity==="string"?j.integrity:void 0,nonce:typeof j.nonce==="string"?j.nonce:void 0})}else j==null&&O.d.M(P)},vM.preload=function(P,j){var E="";if(typeof P==="string"&&P||(E+=" The `href` argument encountered was "+b(P)+"."),j==null||typeof j!=="object"?E+=" The `options` argument encountered was "+b(j)+".":typeof j.as==="string"&&j.as||(E+=" The `as` option encountered was "+b(j.as)+"."),E&&console.error('ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',E),typeof P==="string"&&typeof j==="object"&&j!==null&&typeof j.as==="string"){E=j.as;var X0=A(E,j.crossOrigin);O.d.L(P,E,{crossOrigin:X0,integrity:typeof j.integrity==="string"?j.integrity:void 0,nonce:typeof j.nonce==="string"?j.nonce:void 0,type:typeof j.type==="string"?j.type:void 0,fetchPriority:typeof j.fetchPriority==="string"?j.fetchPriority:void 0,referrerPolicy:typeof j.referrerPolicy==="string"?j.referrerPolicy:void 0,imageSrcSet:typeof j.imageSrcSet==="string"?j.imageSrcSet:void 0,imageSizes:typeof j.imageSizes==="string"?j.imageSizes:void 0,media:typeof j.media==="string"?j.media:void 0})}},vM.preloadModule=function(P,j){var E="";typeof P==="string"&&P||(E+=" The `href` argument encountered was "+b(P)+"."),j!==void 0&&typeof j!=="object"?E+=" The `options` argument encountered was "+b(j)+".":j&&("as"in j)&&typeof j.as!=="string"&&(E+=" The `as` option encountered was "+b(j.as)+"."),E&&console.error('ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',E),typeof P==="string"&&(j?(E=A(j.as,j.crossOrigin),O.d.m(P,{as:typeof j.as==="string"&&j.as!=="script"?j.as:void 0,crossOrigin:E,integrity:typeof j.integrity==="string"?j.integrity:void 0})):O.d.m(P))},vM.requestFormReset=function(P){O.d.r(P)},vM.unstable_batchedUpdates=function(P,j){return P(j)},vM.useFormState=function(P,j,E){return _().useFormState(P,j,E)},vM.useFormStatus=function(){return _().useHostTransitionStatus()},vM.version="19.2.0",typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop==="function"&&__REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error())})()});var $8=Hw((XI,K$)=>{var gM=N0(U$());K$.exports=gM});var W$=Hw((xM)=>{var _0=N0(q$()),z4=N0(q5()),gG=N0($8());(function(){function Q(w,v){for(w=w.memoizedState;w!==null&&0<v;)w=w.next,v--;return w}function $(w,v,g,x){if(g>=v.length)return x;var z=v[g],G=Ow(w)?w.slice():O0({},w);return G[z]=$(w[z],v,g+1,x),G}function M(w,v,g){if(v.length!==g.length)console.warn("copyWithRename() expects paths of the same length");else{for(var x=0;x<g.length-1;x++)if(v[x]!==g[x]){console.warn("copyWithRename() expects paths to be the same except for the deepest key");return}return A(w,v,g,0)}}function A(w,v,g,x){var z=v[x],G=Ow(w)?w.slice():O0({},w);return x+1===v.length?(G[g[x]]=G[z],Ow(G)?G.splice(z,1):delete G[z]):G[z]=A(w[z],v,g,x+1),G}function b(w,v,g){var x=v[g],z=Ow(w)?w.slice():O0({},w);if(g+1===v.length)return Ow(z)?z.splice(x,1):delete z[x],z;return z[x]=b(w[x],v,g+1),z}function d(){return!1}function _(){return null}function O(){console.error("Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. You can only call Hooks at the top level of your React function. For more information, see https://react.dev/link/rules-of-hooks")}function m(){console.error("Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo().")}function r(){}function P(){}function j(w){var v=[];return w.forEach(function(g){v.push(g)}),v.sort().join(", ")}function E(w,v,g,x){return new Sq(w,v,g,x)}function X0(w,v){w.context===N5&&(b9(w.current,2,v,w,null,null),Kg())}function Q0(w,v){if(d2!==null){var g=v.staleFamilies;v=v.updatedFamilies,d4(),MZ(w.current,v,g),Kg()}}function K0(w){d2=w}function f0(w){return!(!w||w.nodeType!==1&&w.nodeType!==9&&w.nodeType!==11)}function Aw(w){var v=w,g=w;if(w.alternate)for(;v.return;)v=v.return;else{w=v;do v=w,(v.flags&4098)!==0&&(g=v.return),w=v.return;while(w)}return v.tag===3?g:null}function Cw(w){if(w.tag===13){var v=w.memoizedState;if(v===null&&(w=w.alternate,w!==null&&(v=w.memoizedState)),v!==null)return v.dehydrated}return null}function $w(w){if(w.tag===31){var v=w.memoizedState;if(v===null&&(w=w.alternate,w!==null&&(v=w.memoizedState)),v!==null)return v.dehydrated}return null}function c0(w){if(Aw(w)!==w)throw Error("Unable to find node on an unmounted component.")}function x2(w){var v=w.alternate;if(!v){if(v=Aw(w),v===null)throw Error("Unable to find node on an unmounted component.");return v!==w?null:w}for(var g=w,x=v;;){var z=g.return;if(z===null)break;var G=z.alternate;if(G===null){if(x=z.return,x!==null){g=x;continue}break}if(z.child===G.child){for(G=z.child;G;){if(G===g)return c0(z),w;if(G===x)return c0(z),v;G=G.sibling}throw Error("Unable to find node on an unmounted component.")}if(g.return!==x.return)g=z,x=G;else{for(var Z=!1,B=z.child;B;){if(B===g){Z=!0,g=z,x=G;break}if(B===x){Z=!0,x=z,g=G;break}B=B.sibling}if(!Z){for(B=G.child;B;){if(B===g){Z=!0,g=G,x=z;break}if(B===x){Z=!0,x=G,g=z;break}B=B.sibling}if(!Z)throw Error("Child was not found in either parent set. This indicates a bug in React related to the return pointer. Please file an issue.")}}if(g.alternate!==x)throw Error("Return fibers should always be each others' alternates. This error is likely caused by a bug in React. Please file an issue.")}if(g.tag!==3)throw Error("Unable to find node on an unmounted component.");return g.stateNode.current===g?w:v}function $2(w){var v=w.tag;if(v===5||v===26||v===27||v===6)return w;for(w=w.child;w!==null;){if(v=$2(w),v!==null)return v;w=w.sibling}return null}function o0(w){if(w===null||typeof w!=="object")return null;return w=OH&&w[OH]||w["@@iterator"],typeof w==="function"?w:null}function b0(w){if(w==null)return null;if(typeof w==="function")return w.$$typeof===zK?null:w.displayName||w.name||null;if(typeof w==="string")return w;switch(w){case jg:return"Fragment";case D9:return"Profiler";case G6:return"StrictMode";case F9:return"Suspense";case h9:return"SuspenseList";case P9:return"Activity"}if(typeof w==="object")switch(typeof w.tag==="number"&&console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."),w.$$typeof){case bg:return"Portal";case h1:return w.displayName||"Context";case k9:return(w._context.displayName||"Context")+".Consumer";case r4:var v=w.render;return w=w.displayName,w||(w=v.displayName||v.name||"",w=w!==""?"ForwardRef("+w+")":"ForwardRef"),w;case Z6:return v=w.displayName||null,v!==null?v:b0(w.type)||"Memo";case A2:v=w._payload,w=w._init;try{return b0(w(v))}catch(g){}}return null}function Zw(w){return typeof w.tag==="number"?l(w):typeof w.name==="string"?w.name:null}function l(w){var v=w.type;switch(w.tag){case 31:return"Activity";case 24:return"Cache";case 9:return(v._context.displayName||"Context")+".Consumer";case 10:return v.displayName||"Context";case 18:return"DehydratedFragment";case 11:return w=v.render,w=w.displayName||w.name||"",v.displayName||(w!==""?"ForwardRef("+w+")":"ForwardRef");case 7:return"Fragment";case 26:case 27:case 5:return v;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return b0(v);case 8:return v===G6?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 14:case 15:if(typeof v==="function")return v.displayName||v.name||null;if(typeof v==="string")return v;break;case 29:if(v=w._debugInfo,v!=null){for(var g=v.length-1;0<=g;g--)if(typeof v[g].name==="string")return v[g].name}if(w.return!==null)return l(w.return)}return null}function xw(w){return{current:w}}function k0(w,v){0>o1?console.error("Unexpected pop."):(v!==_9[o1]&&console.error("Unexpected Fiber popped."),w.current=C9[o1],C9[o1]=null,_9[o1]=null,o1--)}function h(w,v,g){o1++,C9[o1]=w.current,_9[o1]=g,w.current=v}function y(w){return w===null&&console.error("Expected host context to exist. This error is likely caused by a bug in React. Please file an issue."),w}function C(w,v){h(h5,v,w),h(n4,w,w),h(F5,null,w);var g=v.nodeType;switch(g){case 9:case 11:g=g===9?"#document":"#fragment",v=(v=v.documentElement)?(v=v.namespaceURI)?rX(v):J5:J5;break;default:if(g=v.tagName,v=v.namespaceURI)v=rX(v),v=nX(v,g);else switch(g){case"svg":v=g4;break;case"math":v=z8;break;default:v=J5}}g=g.toLowerCase(),g=lG(null,g),g={context:v,ancestorInfo:g},k0(F5,w),h(F5,g,w)}function T(w){k0(F5,w),k0(n4,w),k0(h5,w)}function S(){return y(F5.current)}function t(w){w.memoizedState!==null&&h(B6,w,w);var v=y(F5.current),g=w.type,x=nX(v.context,g);g=lG(v.ancestorInfo,g),x={context:x,ancestorInfo:g},v!==x&&(h(n4,w,w),h(F5,x,w))}function o(w){n4.current===w&&(k0(F5,w),k0(n4,w)),B6.current===w&&(k0(B6,w),mx._currentValue=ov)}function V(){}function a(){if(o4===0){RH=console.log,VH=console.info,DH=console.warn,kH=console.error,FH=console.group,hH=console.groupCollapsed,PH=console.groupEnd;var w={configurable:!0,enumerable:!0,value:V,writable:!0};Object.defineProperties(console,{info:w,log:w,warn:w,error:w,group:w,groupCollapsed:w,groupEnd:w})}o4++}function v0(){if(o4--,o4===0){var w={configurable:!0,enumerable:!0,writable:!0};Object.defineProperties(console,{log:O0({},w,{value:RH}),info:O0({},w,{value:VH}),warn:O0({},w,{value:DH}),error:O0({},w,{value:kH}),group:O0({},w,{value:FH}),groupCollapsed:O0({},w,{value:hH}),groupEnd:O0({},w,{value:PH})})}0>o4&&console.error("disabledDepth fell below zero. This is a bug in React. Please file an issue.")}function p(w){var v=Error.prepareStackTrace;if(Error.prepareStackTrace=void 0,w=w.stack,Error.prepareStackTrace=v,w.startsWith(`Error: react-stack-top-frame
`)&&(w=w.slice(29)),v=w.indexOf(`
`),v!==-1&&(w=w.slice(v+1)),v=w.indexOf("react_stack_bottom_frame"),v!==-1&&(v=w.lastIndexOf(`
`,v)),v!==-1)w=w.slice(0,v);else return"";return w}function U0(w){if(f9===void 0)try{throw Error()}catch(g){var v=g.stack.trim().match(/\n( *(at )?)/);f9=v&&v[1]||"",CH=-1<g.stack.indexOf(`
    at`)?" (<anonymous>)":-1<g.stack.indexOf("@")?"@unknown:0:0":""}return`
`+f9+w+CH}function s0(w,v){if(!w||E9)return"";var g=N9.get(w);if(g!==void 0)return g;E9=!0,g=Error.prepareStackTrace,Error.prepareStackTrace=void 0;var x=null;x=k.H,k.H=null,a();try{var z={DetermineComponentFrameRoot:function(){try{if(v){var U=function(){throw Error()};if(Object.defineProperty(U.prototype,"props",{set:function(){throw Error()}}),typeof Reflect==="object"&&Reflect.construct){try{Reflect.construct(U,[])}catch(u){var R=u}Reflect.construct(w,[],U)}else{try{U.call()}catch(u){R=u}w.call(U.prototype)}}else{try{throw Error()}catch(u){R=u}(U=w())&&typeof U.catch==="function"&&U.catch(function(){})}}catch(u){if(u&&R&&typeof u.stack==="string")return[u.stack,R.stack]}return[null,null]}};z.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var G=Object.getOwnPropertyDescriptor(z.DetermineComponentFrameRoot,"name");G&&G.configurable&&Object.defineProperty(z.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var Z=z.DetermineComponentFrameRoot(),B=Z[0],X=Z[1];if(B&&X){var H=B.split(`
`),Y=X.split(`
`);for(Z=G=0;G<H.length&&!H[G].includes("DetermineComponentFrameRoot");)G++;for(;Z<Y.length&&!Y[Z].includes("DetermineComponentFrameRoot");)Z++;if(G===H.length||Z===Y.length)for(G=H.length-1,Z=Y.length-1;1<=G&&0<=Z&&H[G]!==Y[Z];)Z--;for(;1<=G&&0<=Z;G--,Z--)if(H[G]!==Y[Z]){if(G!==1||Z!==1)do if(G--,Z--,0>Z||H[G]!==Y[Z]){var L=`
`+H[G].replace(" at new "," at ");return w.displayName&&L.includes("<anonymous>")&&(L=L.replace("<anonymous>",w.displayName)),typeof w==="function"&&N9.set(w,L),L}while(1<=G&&0<=Z);break}}}finally{E9=!1,k.H=x,v0(),Error.prepareStackTrace=g}return H=(H=w?w.displayName||w.name:"")?U0(H):"",typeof w==="function"&&N9.set(w,H),H}function E0(w,v){switch(w.tag){case 26:case 27:case 5:return U0(w.type);case 16:return U0("Lazy");case 13:return w.child!==v&&v!==null?U0("Suspense Fallback"):U0("Suspense");case 19:return U0("SuspenseList");case 0:case 15:return s0(w.type,!1);case 11:return s0(w.type.render,!1);case 1:return s0(w.type,!0);case 31:return U0("Activity");default:return""}}function yw(w){try{var v="",g=null;do{v+=E0(w,g);var x=w._debugInfo;if(x)for(var z=x.length-1;0<=z;z--){var G=x[z];if(typeof G.name==="string"){var Z=v;w:{var{name:B,env:X,debugLocation:H}=G;if(H!=null){var Y=p(H),L=Y.lastIndexOf(`
`),U=L===-1?Y:Y.slice(L+1);if(U.indexOf(B)!==-1){var R=`
`+U;break w}}R=U0(B+(X?" ["+X+"]":""))}v=Z+R}}g=w,w=w.return}while(w);return v}catch(u){return`
Error generating stack: `+u.message+`
`+u.stack}}function z2(w){return(w=w?w.displayName||w.name:"")?U0(w):""}function o2(){if(O2===null)return null;var w=O2._debugOwner;return w!=null?Zw(w):null}function ev(){if(O2===null)return"";var w=O2;try{var v="";switch(w.tag===6&&(w=w.return),w.tag){case 26:case 27:case 5:v+=U0(w.type);break;case 13:v+=U0("Suspense");break;case 19:v+=U0("SuspenseList");break;case 31:v+=U0("Activity");break;case 30:case 0:case 15:case 1:w._debugOwner||v!==""||(v+=z2(w.type));break;case 11:w._debugOwner||v!==""||(v+=z2(w.type.render))}for(;w;)if(typeof w.tag==="number"){var g=w;w=g._debugOwner;var x=g._debugStack;if(w&&x){var z=p(x);z!==""&&(v+=`
`+z)}}else if(w.debugStack!=null){var G=w.debugStack;(w=w.owner)&&G&&(v+=`
`+p(G))}else break;var Z=v}catch(B){Z=`
Error generating stack: `+B.message+`
`+B.stack}return Z}function n(w,v,g,x,z,G,Z){var B=O2;g0(w);try{return w!==null&&w._debugTask?w._debugTask.run(v.bind(null,g,x,z,G,Z)):v(g,x,z,G,Z)}finally{g0(B)}throw Error("runWithFiberInDEV should never be called in production. This is a bug in React.")}function g0(w){k.getCurrentStack=w===null?null:ev,P1=!1,O2=w}function t2(w){return typeof Symbol==="function"&&Symbol.toStringTag&&w[Symbol.toStringTag]||w.constructor.name||"Object"}function q2(w){try{return qw(w),!1}catch(v){return!0}}function qw(w){return""+w}function u0(w,v){if(q2(w))return console.error("The provided `%s` attribute is an unsupported type %s. This value must be coerced to a string before using it here.",v,t2(w)),qw(w)}function J4(w,v){if(q2(w))return console.error("The provided `%s` CSS property is an unsupported type %s. This value must be coerced to a string before using it here.",v,t2(w)),qw(w)}function M0(w){if(q2(w))return console.error("Form field values (value, checked, defaultValue, or defaultChecked props) must be strings, not %s. This value must be coerced to a string before using it here.",t2(w)),qw(w)}function wg(w){if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u")return!1;var v=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(v.isDisabled)return!0;if(!v.supportsFiber)return console.error("The installed version of React DevTools is too old and will not work with the current version of React. Please update React DevTools. https://react.dev/link/react-devtools"),!0;try{Og=v.inject(w),mw=v}catch(g){console.error("React instrumentation encountered an error: %o.",g)}return v.checkDCE?!0:!1}function i0(w){if(typeof QK==="function"&&$K(w),mw&&typeof mw.setStrictMode==="function")try{mw.setStrictMode(Og,w)}catch(v){C1||(C1=!0,console.error("React instrumentation encountered an error: %o",v))}}function nx(w){return w>>>=0,w===0?32:31-(qK(w)/UK|0)|0}function $1(w){var v=w&42;if(v!==0)return v;switch(w&-w){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:return 64;case 128:return 128;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:return w&261888;case 262144:case 524288:case 1048576:case 2097152:return w&3932160;case 4194304:case 8388608:case 16777216:case 33554432:return w&62914560;case 67108864:return 67108864;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 0;default:return console.error("Should have found matching lanes. This is a bug in React."),w}}function Bv(w,v,g){var x=w.pendingLanes;if(x===0)return 0;var z=0,G=w.suspendedLanes,Z=w.pingedLanes;w=w.warmLanes;var B=x&134217727;return B!==0?(x=B&~G,x!==0?z=$1(x):(Z&=B,Z!==0?z=$1(Z):g||(g=B&~w,g!==0&&(z=$1(g))))):(B=x&~G,B!==0?z=$1(B):Z!==0?z=$1(Z):g||(g=x&~w,g!==0&&(z=$1(g)))),z===0?0:v!==0&&v!==z&&(v&G)===0&&(G=z&-z,g=v&-v,G>=g||G===32&&(g&4194048)!==0)?v:z}function Xv(w,v){return(w.pendingLanes&~(w.suspendedLanes&~w.pingedLanes)&v)===0}function b8(w,v){switch(w){case 1:case 2:case 4:case 8:case 64:return v+250;case 16:case 32:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return v+5000;case 4194304:case 8388608:case 16777216:case 33554432:return-1;case 67108864:case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return console.error("Should have found matching lanes. This is a bug in React."),-1}}function vg(){var w=J6;return J6<<=1,(J6&62914560)===0&&(J6=4194304),w}function gg(w){for(var v=[],g=0;31>g;g++)v.push(w);return v}function U5(w,v){w.pendingLanes|=v,v!==268435456&&(w.suspendedLanes=0,w.pingedLanes=0,w.warmLanes=0)}function ox(w,v,g,x,z,G){var Z=w.pendingLanes;w.pendingLanes=g,w.suspendedLanes=0,w.pingedLanes=0,w.warmLanes=0,w.expiredLanes&=g,w.entangledLanes&=g,w.errorRecoveryDisabledLanes&=g,w.shellSuspendCounter=0;var{entanglements:B,expirationTimes:X,hiddenUpdates:H}=w;for(g=Z&~g;0<g;){var Y=31-cw(g),L=1<<Y;B[Y]=0,X[Y]=-1;var U=H[Y];if(U!==null)for(H[Y]=null,Y=0;Y<U.length;Y++){var R=U[Y];R!==null&&(R.lane&=-536870913)}g&=~L}x!==0&&Hv(w,x,0),G!==0&&z===0&&w.tag!==0&&(w.suspendedLanes|=G&~(Z&~v))}function Hv(w,v,g){w.pendingLanes|=v,w.suspendedLanes&=~v;var x=31-cw(v);w.entangledLanes|=v,w.entanglements[x]=w.entanglements[x]|1073741824|g&261930}function Jv(w,v){var g=w.entangledLanes|=v;for(w=w.entanglements;g;){var x=31-cw(g),z=1<<x;z&v|w[x]&v&&(w[x]|=v),g&=~z}}function Qv(w,v){var g=v&-v;return g=(g&42)!==0?1:$v(g),(g&(w.suspendedLanes|v))!==0?0:g}function $v(w){switch(w){case 2:w=1;break;case 8:w=4;break;case 32:w=16;break;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:w=128;break;case 268435456:w=134217728;break;default:w=0}return w}function Q4(w,v,g){if(_1)for(w=w.pendingUpdatersLaneMap;0<g;){var x=31-cw(g),z=1<<x;w[x].add(v),g&=~z}}function K5(w,v){if(_1)for(var{pendingUpdatersLaneMap:g,memoizedUpdaters:x}=w;0<v;){var z=31-cw(v);w=1<<z,z=g[z],0<z.size&&(z.forEach(function(G){var Z=G.alternate;Z!==null&&x.has(Z)||x.add(G)}),z.clear()),v&=~w}}function J(w){return w&=-w,R2!==0&&R2<w?g1!==0&&g1<w?(w&134217727)!==0?f1:Q6:g1:R2}function I(){var w=d0.p;if(w!==0)return w;return w=window.event,w===void 0?f1:MH(w.type)}function N(w,v){var g=d0.p;try{return d0.p=w,v()}finally{d0.p=g}}function c(w){delete w[Nw],delete w[sw],delete w[u9],delete w[KK],delete w[WK]}function e(w){var v=w[Nw];if(v)return v;for(var g=w.parentNode;g;){if(v=g[C5]||g[Nw]){if(g=v.alternate,v.child!==null||g!==null&&g.child!==null)for(w=xH(w);w!==null;){if(g=w[Nw])return g;w=xH(w)}return v}w=g,g=w.parentNode}return null}function $0(w){if(w=w[Nw]||w[C5]){var v=w.tag;if(v===5||v===6||v===13||v===31||v===26||v===27||v===3)return w}return null}function q0(w){var v=w.tag;if(v===5||v===26||v===27||v===6)return w.stateNode;throw Error("getNodeFromInstance: Invalid argument.")}function C0(w){var v=w[_H];return v||(v=w[_H]={hoistableStyles:new Map,hoistableScripts:new Map}),v}function z0(w){w[t4]=!0}function dw(w,v){U2(w,v),U2(w+"Capture",v)}function U2(w,v){kv[w]&&console.error("EventRegistry: More than one plugin attempted to publish the same registration name, `%s`.",w),kv[w]=v;var g=w.toLowerCase();l9[g]=w,w==="onDoubleClick"&&(l9.ondblclick=w);for(w=0;w<v.length;w++)fH.add(v[w])}function W5(w,v){MK[v.type]||v.onChange||v.onInput||v.readOnly||v.disabled||v.value==null||(w==="select"?console.error("You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set `onChange`."):console.error("You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set either `onChange` or `readOnly`.")),v.onChange||v.readOnly||v.disabled||v.checked==null||console.error("You provided a `checked` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultChecked`. Otherwise, set either `onChange` or `readOnly`.")}function $4(w){if(v1.call(NH,w))return!0;if(v1.call(EH,w))return!1;if(YK.test(w))return NH[w]=!0;return EH[w]=!0,console.error("Invalid attribute name: `%s`",w),!1}function DG(w,v,g){if($4(v)){if(!w.hasAttribute(v)){switch(typeof g){case"symbol":case"object":return g;case"function":return g;case"boolean":if(g===!1)return g}return g===void 0?void 0:null}if(w=w.getAttribute(v),w===""&&g===!0)return!0;return u0(g,v),w===""+g?g:w}}function tx(w,v,g){if($4(v))if(g===null)w.removeAttribute(v);else{switch(typeof g){case"undefined":case"function":case"symbol":w.removeAttribute(v);return;case"boolean":var x=v.toLowerCase().slice(0,5);if(x!=="data-"&&x!=="aria-"){w.removeAttribute(v);return}}u0(g,v),w.setAttribute(v,""+g)}}function px(w,v,g){if(g===null)w.removeAttribute(v);else{switch(typeof g){case"undefined":case"function":case"symbol":case"boolean":w.removeAttribute(v);return}u0(g,v),w.setAttribute(v,""+g)}}function u1(w,v,g,x){if(x===null)w.removeAttribute(g);else{switch(typeof x){case"undefined":case"function":case"symbol":case"boolean":w.removeAttribute(g);return}u0(x,g),w.setAttributeNS(v,g,""+x)}}function _2(w){switch(typeof w){case"bigint":case"boolean":case"number":case"string":case"undefined":return w;case"object":return M0(w),w;default:return""}}function kG(w){var v=w.type;return(w=w.nodeName)&&w.toLowerCase()==="input"&&(v==="checkbox"||v==="radio")}function Uq(w,v,g){var x=Object.getOwnPropertyDescriptor(w.constructor.prototype,v);if(!w.hasOwnProperty(v)&&typeof x<"u"&&typeof x.get==="function"&&typeof x.set==="function"){var{get:z,set:G}=x;return Object.defineProperty(w,v,{configurable:!0,get:function(){return z.call(this)},set:function(Z){M0(Z),g=""+Z,G.call(this,Z)}}),Object.defineProperty(w,v,{enumerable:x.enumerable}),{getValue:function(){return g},setValue:function(Z){M0(Z),g=""+Z},stopTracking:function(){w._valueTracker=null,delete w[v]}}}}function j8(w){if(!w._valueTracker){var v=kG(w)?"checked":"value";w._valueTracker=Uq(w,v,""+w[v])}}function FG(w){if(!w)return!1;var v=w._valueTracker;if(!v)return!0;var g=v.getValue(),x="";return w&&(x=kG(w)?w.checked?"true":"false":w.value),w=x,w!==g?(v.setValue(w),!0):!1}function ex(w){if(w=w||(typeof document<"u"?document:void 0),typeof w>"u")return null;try{return w.activeElement||w.body}catch(v){return w.body}}function f2(w){return w.replace(LK,function(v){return"\\"+v.charCodeAt(0).toString(16)+" "})}function hG(w,v){v.checked===void 0||v.defaultChecked===void 0||dH||(console.error("%s contains an input of type %s with both checked and defaultChecked props. Input elements must be either controlled or uncontrolled (specify either the checked prop, or the defaultChecked prop, but not both). Decide between using a controlled or uncontrolled input element and remove one of these props. More info: https://react.dev/link/controlled-components",o2()||"A component",v.type),dH=!0),v.value===void 0||v.defaultValue===void 0||SH||(console.error("%s contains an input of type %s with both value and defaultValue props. Input elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled input element and remove one of these props. More info: https://react.dev/link/controlled-components",o2()||"A component",v.type),SH=!0)}function A8(w,v,g,x,z,G,Z,B){if(w.name="",Z!=null&&typeof Z!=="function"&&typeof Z!=="symbol"&&typeof Z!=="boolean"?(u0(Z,"type"),w.type=Z):w.removeAttribute("type"),v!=null)if(Z==="number"){if(v===0&&w.value===""||w.value!=v)w.value=""+_2(v)}else w.value!==""+_2(v)&&(w.value=""+_2(v));else Z!=="submit"&&Z!=="reset"||w.removeAttribute("value");v!=null?O8(w,Z,_2(v)):g!=null?O8(w,Z,_2(g)):x!=null&&w.removeAttribute("value"),z==null&&G!=null&&(w.defaultChecked=!!G),z!=null&&(w.checked=z&&typeof z!=="function"&&typeof z!=="symbol"),B!=null&&typeof B!=="function"&&typeof B!=="symbol"&&typeof B!=="boolean"?(u0(B,"name"),w.name=""+_2(B)):w.removeAttribute("name")}function PG(w,v,g,x,z,G,Z,B){if(G!=null&&typeof G!=="function"&&typeof G!=="symbol"&&typeof G!=="boolean"&&(u0(G,"type"),w.type=G),v!=null||g!=null){if(!(G!=="submit"&&G!=="reset"||v!==void 0&&v!==null)){j8(w);return}g=g!=null?""+_2(g):"",v=v!=null?""+_2(v):g,B||v===w.value||(w.value=v),w.defaultValue=v}x=x!=null?x:z,x=typeof x!=="function"&&typeof x!=="symbol"&&!!x,w.checked=B?w.checked:!!x,w.defaultChecked=!!x,Z!=null&&typeof Z!=="function"&&typeof Z!=="symbol"&&typeof Z!=="boolean"&&(u0(Z,"name"),w.name=Z),j8(w)}function O8(w,v,g){v==="number"&&ex(w.ownerDocument)===w||w.defaultValue===""+g||(w.defaultValue=""+g)}function CG(w,v){v.value==null&&(typeof v.children==="object"&&v.children!==null?z4.Children.forEach(v.children,function(g){g==null||typeof g==="string"||typeof g==="number"||typeof g==="bigint"||mH||(mH=!0,console.error("Cannot infer the option value of complex children. Pass a `value` prop or use a plain string as children to <option>."))}):v.dangerouslySetInnerHTML==null||uH||(uH=!0,console.error("Pass a `value` prop if you set dangerouslyInnerHTML so React knows which value should be selected."))),v.selected==null||TH||(console.error("Use the `defaultValue` or `value` props on <select> instead of setting `selected` on <option>."),TH=!0)}function _G(){var w=o2();return w?`

Check the render method of \``+w+"`.":""}function xg(w,v,g,x){if(w=w.options,v){v={};for(var z=0;z<g.length;z++)v["$"+g[z]]=!0;for(g=0;g<w.length;g++)z=v.hasOwnProperty("$"+w[g].value),w[g].selected!==z&&(w[g].selected=z),z&&x&&(w[g].defaultSelected=!0)}else{g=""+_2(g),v=null;for(z=0;z<w.length;z++){if(w[z].value===g){w[z].selected=!0,x&&(w[z].defaultSelected=!0);return}v!==null||w[z].disabled||(v=w[z])}v!==null&&(v.selected=!0)}}function fG(w,v){for(w=0;w<yH.length;w++){var g=yH[w];if(v[g]!=null){var x=Ow(v[g]);v.multiple&&!x?console.error("The `%s` prop supplied to <select> must be an array if `multiple` is true.%s",g,_G()):!v.multiple&&x&&console.error("The `%s` prop supplied to <select> must be a scalar value if `multiple` is false.%s",g,_G())}}v.value===void 0||v.defaultValue===void 0||lH||(console.error("Select elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled select element and remove one of these props. More info: https://react.dev/link/controlled-components"),lH=!0)}function EG(w,v){v.value===void 0||v.defaultValue===void 0||aH||(console.error("%s contains a textarea with both value and defaultValue props. Textarea elements must be either controlled or uncontrolled (specify either the value prop, or the defaultValue prop, but not both). Decide between using a controlled or uncontrolled textarea and remove one of these props. More info: https://react.dev/link/controlled-components",o2()||"A component"),aH=!0),v.children!=null&&v.value==null&&console.error("Use the `defaultValue` or `value` props instead of setting children on <textarea>.")}function NG(w,v,g){if(v!=null&&(v=""+_2(v),v!==w.value&&(w.value=v),g==null)){w.defaultValue!==v&&(w.defaultValue=v);return}w.defaultValue=g!=null?""+_2(g):""}function SG(w,v,g,x){if(v==null){if(x!=null){if(g!=null)throw Error("If you supply `defaultValue` on a <textarea>, do not pass children.");if(Ow(x)){if(1<x.length)throw Error("<textarea> can only have at most one child.");x=x[0]}g=x}g==null&&(g=""),v=g}g=_2(v),w.defaultValue=g,x=w.textContent,x===g&&x!==""&&x!==null&&(w.value=x),j8(w)}function dG(w,v){return w.serverProps===void 0&&w.serverTail.length===0&&w.children.length===1&&3<w.distanceFromLeaf&&w.distanceFromLeaf>15-v?dG(w.children[0],v):w}function K2(w){return"  "+"  ".repeat(w)}function zg(w){return"+ "+"  ".repeat(w)}function qv(w){return"- "+"  ".repeat(w)}function TG(w){switch(w.tag){case 26:case 27:case 5:return w.type;case 16:return"Lazy";case 31:return"Activity";case 13:return"Suspense";case 19:return"SuspenseList";case 0:case 15:return w=w.type,w.displayName||w.name||null;case 11:return w=w.type.render,w.displayName||w.name||null;case 1:return w=w.type,w.displayName||w.name||null;default:return null}}function q4(w,v){return cH.test(w)?(w=JSON.stringify(w),w.length>v-2?8>v?'{"..."}':"{"+w.slice(0,v-7)+'..."}':"{"+w+"}"):w.length>v?5>v?'{"..."}':w.slice(0,v-3)+"...":w}function w3(w,v,g){var x=120-2*g;if(v===null)return zg(g)+q4(w,x)+`
`;if(typeof v==="string"){for(var z=0;z<v.length&&z<w.length&&v.charCodeAt(z)===w.charCodeAt(z);z++);return z>x-8&&10<z&&(w="..."+w.slice(z-8),v="..."+v.slice(z-8)),zg(g)+q4(w,x)+`
`+qv(g)+q4(v,x)+`
`}return K2(g)+q4(w,x)+`
`}function R8(w){return Object.prototype.toString.call(w).replace(/^\[object (.*)\]$/,function(v,g){return g})}function U4(w,v){switch(typeof w){case"string":return w=JSON.stringify(w),w.length>v?5>v?'"..."':w.slice(0,v-4)+'..."':w;case"object":if(w===null)return"null";if(Ow(w))return"[...]";if(w.$$typeof===F1)return(v=b0(w.type))?"<"+v+">":"<...>";var g=R8(w);if(g==="Object"){g="",v-=2;for(var x in w)if(w.hasOwnProperty(x)){var z=JSON.stringify(x);if(z!=='"'+x+'"'&&(x=z),v-=x.length-2,z=U4(w[x],15>v?v:15),v-=z.length,0>v){g+=g===""?"...":", ...";break}g+=(g===""?"":",")+x+":"+z}return"{"+g+"}"}return g;case"function":return(v=w.displayName||w.name)?"function "+v:"function";default:return String(w)}}function Gg(w,v){return typeof w!=="string"||cH.test(w)?"{"+U4(w,v-2)+"}":w.length>v-2?5>v?'"..."':'"'+w.slice(0,v-5)+'..."':'"'+w+'"'}function V8(w,v,g){var x=120-g.length-w.length,z=[],G;for(G in v)if(v.hasOwnProperty(G)&&G!=="children"){var Z=Gg(v[G],120-g.length-G.length-1);x-=G.length+Z.length+2,z.push(G+"="+Z)}return z.length===0?g+"<"+w+`>
`:0<x?g+"<"+w+" "+z.join(" ")+`>
`:g+"<"+w+`
`+g+"  "+z.join(`
`+g+"  ")+`
`+g+`>
`}function Kq(w,v,g){var x="",z=O0({},v),G;for(G in w)if(w.hasOwnProperty(G)){delete z[G];var Z=120-2*g-G.length-2,B=U4(w[G],Z);v.hasOwnProperty(G)?(Z=U4(v[G],Z),x+=zg(g)+G+": "+B+`
`,x+=qv(g)+G+": "+Z+`
`):x+=zg(g)+G+": "+B+`
`}for(var X in z)z.hasOwnProperty(X)&&(w=U4(z[X],120-2*g-X.length-2),x+=qv(g)+X+": "+w+`
`);return x}function Wq(w,v,g,x){var z="",G=new Map;for(H in g)g.hasOwnProperty(H)&&G.set(H.toLowerCase(),H);if(G.size===1&&G.has("children"))z+=V8(w,v,K2(x));else{for(var Z in v)if(v.hasOwnProperty(Z)&&Z!=="children"){var B=120-2*(x+1)-Z.length-1,X=G.get(Z.toLowerCase());if(X!==void 0){G.delete(Z.toLowerCase());var H=v[Z];X=g[X];var Y=Gg(H,B);B=Gg(X,B),typeof H==="object"&&H!==null&&typeof X==="object"&&X!==null&&R8(H)==="Object"&&R8(X)==="Object"&&(2<Object.keys(H).length||2<Object.keys(X).length||-1<Y.indexOf("...")||-1<B.indexOf("..."))?z+=K2(x+1)+Z+`={{
`+Kq(H,X,x+2)+K2(x+1)+`}}
`:(z+=zg(x+1)+Z+"="+Y+`
`,z+=qv(x+1)+Z+"="+B+`
`)}else z+=K2(x+1)+Z+"="+Gg(v[Z],B)+`
`}G.forEach(function(L){if(L!=="children"){var U=120-2*(x+1)-L.length-1;z+=qv(x+1)+L+"="+Gg(g[L],U)+`
`}}),z=z===""?K2(x)+"<"+w+`>
`:K2(x)+"<"+w+`
`+z+K2(x)+`>
`}if(w=g.children,v=v.children,typeof w==="string"||typeof w==="number"||typeof w==="bigint"){if(G="",typeof v==="string"||typeof v==="number"||typeof v==="bigint")G=""+v;z+=w3(G,""+w,x+1)}else if(typeof v==="string"||typeof v==="number"||typeof v==="bigint")z=w==null?z+w3(""+v,null,x+1):z+w3(""+v,void 0,x+1);return z}function mG(w,v){var g=TG(w);if(g===null){g="";for(w=w.child;w;)g+=mG(w,v),w=w.sibling;return g}return K2(v)+"<"+g+`>
`}function D8(w,v){var g=dG(w,v);if(g!==w&&(w.children.length!==1||w.children[0]!==g))return K2(v)+`...
`+D8(g,v+1);g="";var x=w.fiber._debugInfo;if(x)for(var z=0;z<x.length;z++){var G=x[z].name;typeof G==="string"&&(g+=K2(v)+"<"+G+`>
`,v++)}if(x="",z=w.fiber.pendingProps,w.fiber.tag===6)x=w3(z,w.serverProps,v),v++;else if(G=TG(w.fiber),G!==null)if(w.serverProps===void 0){x=v;var Z=120-2*x-G.length-2,B="";for(H in z)if(z.hasOwnProperty(H)&&H!=="children"){var X=Gg(z[H],15);if(Z-=H.length+X.length+2,0>Z){B+=" ...";break}B+=" "+H+"="+X}x=K2(x)+"<"+G+B+`>
`,v++}else w.serverProps===null?(x=V8(G,z,zg(v)),v++):typeof w.serverProps==="string"?console.error("Should not have matched a non HostText fiber to a Text node. This is a bug in React."):(x=Wq(G,z,w.serverProps,v),v++);var H="";z=w.fiber.child;for(G=0;z&&G<w.children.length;)Z=w.children[G],Z.fiber===z?(H+=D8(Z,v),G++):H+=mG(z,v),z=z.sibling;z&&0<w.children.length&&(H+=K2(v)+`...
`),z=w.serverTail,w.serverProps===null&&v--;for(w=0;w<z.length;w++)G=z[w],H=typeof G==="string"?H+(qv(v)+q4(G,120-2*v)+`
`):H+V8(G.type,G.props,qv(v));return g+x+H}function k8(w){try{return`

`+D8(w,0)}catch(v){return""}}function uG(w,v,g){for(var x=v,z=null,G=0;x;)x===w&&(G=0),z={fiber:x,children:z!==null?[z]:[],serverProps:x===v?g:x===w?null:void 0,serverTail:[],distanceFromLeaf:G},G++,x=x.return;return z!==null?k8(z).replaceAll(/^[+-]/gm,">"):""}function lG(w,v){var g=O0({},w||iH),x={tag:v};if(sH.indexOf(v)!==-1&&(g.aTagInScope=null,g.buttonTagInScope=null,g.nobrTagInScope=null),bK.indexOf(v)!==-1&&(g.pTagInButtonScope=null),IK.indexOf(v)!==-1&&v!=="address"&&v!=="div"&&v!=="p"&&(g.listItemTagAutoclosing=null,g.dlItemTagAutoclosing=null),g.current=x,v==="form"&&(g.formTag=x),v==="a"&&(g.aTagInScope=x),v==="button"&&(g.buttonTagInScope=x),v==="nobr"&&(g.nobrTagInScope=x),v==="p"&&(g.pTagInButtonScope=x),v==="li"&&(g.listItemTagAutoclosing=x),v==="dd"||v==="dt")g.dlItemTagAutoclosing=x;return v==="#document"||v==="html"?g.containerTagInScope=null:g.containerTagInScope||(g.containerTagInScope=x),w!==null||v!=="#document"&&v!=="html"&&v!=="body"?g.implicitRootScope===!0&&(g.implicitRootScope=!1):g.implicitRootScope=!0,g}function yG(w,v,g){switch(v){case"select":return w==="hr"||w==="option"||w==="optgroup"||w==="script"||w==="template"||w==="#text";case"optgroup":return w==="option"||w==="#text";case"option":return w==="#text";case"tr":return w==="th"||w==="td"||w==="style"||w==="script"||w==="template";case"tbody":case"thead":case"tfoot":return w==="tr"||w==="style"||w==="script"||w==="template";case"colgroup":return w==="col"||w==="template";case"table":return w==="caption"||w==="colgroup"||w==="tbody"||w==="tfoot"||w==="thead"||w==="style"||w==="script"||w==="template";case"head":return w==="base"||w==="basefont"||w==="bgsound"||w==="link"||w==="meta"||w==="title"||w==="noscript"||w==="noframes"||w==="style"||w==="script"||w==="template";case"html":if(g)break;return w==="head"||w==="body"||w==="frameset";case"frameset":return w==="frame";case"#document":if(!g)return w==="html"}switch(w){case"h1":case"h2":case"h3":case"h4":case"h5":case"h6":return v!=="h1"&&v!=="h2"&&v!=="h3"&&v!=="h4"&&v!=="h5"&&v!=="h6";case"rp":case"rt":return jK.indexOf(v)===-1;case"caption":case"col":case"colgroup":case"frameset":case"frame":case"tbody":case"td":case"tfoot":case"th":case"thead":case"tr":return v==null;case"head":return g||v===null;case"html":return g&&v==="#document"||v===null;case"body":return g&&(v==="#document"||v==="html")||v===null}return!0}function Mq(w,v){switch(w){case"address":case"article":case"aside":case"blockquote":case"center":case"details":case"dialog":case"dir":case"div":case"dl":case"fieldset":case"figcaption":case"figure":case"footer":case"header":case"hgroup":case"main":case"menu":case"nav":case"ol":case"p":case"section":case"summary":case"ul":case"pre":case"listing":case"table":case"hr":case"xmp":case"h1":case"h2":case"h3":case"h4":case"h5":case"h6":return v.pTagInButtonScope;case"form":return v.formTag||v.pTagInButtonScope;case"li":return v.listItemTagAutoclosing;case"dd":case"dt":return v.dlItemTagAutoclosing;case"button":return v.buttonTagInScope;case"a":return v.aTagInScope;case"nobr":return v.nobrTagInScope}return null}function aG(w,v){for(;w;){switch(w.tag){case 5:case 26:case 27:if(w.type===v)return w}w=w.return}return null}function F8(w,v){v=v||iH;var g=v.current;if(v=(g=yG(w,g&&g.tag,v.implicitRootScope)?null:g)?null:Mq(w,v),v=g||v,!v)return!0;var x=v.tag;if(v=String(!!g)+"|"+w+"|"+x,$6[v])return!1;$6[v]=!0;var z=(v=O2)?aG(v.return,x):null,G=v!==null&&z!==null?uG(z,v,null):"",Z="<"+w+">";return g?(g="",x==="table"&&w==="tr"&&(g+=" Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated by the browser."),console.error(`In HTML, %s cannot be a child of <%s>.%s
This will cause a hydration error.%s`,Z,x,g,G)):console.error(`In HTML, %s cannot be a descendant of <%s>.
This will cause a hydration error.%s`,Z,x,G),v&&(w=v.return,z===null||w===null||z===w&&w._debugOwner===v._debugOwner||n(z,function(){console.error(`<%s> cannot contain a nested %s.
See this log for the ancestor stack trace.`,x,Z)})),!1}function v3(w,v,g){if(g||yG("#text",v,!1))return!0;if(g="#text|"+v,$6[g])return!1;$6[g]=!0;var x=(g=O2)?aG(g,v):null;return g=g!==null&&x!==null?uG(x,g,g.tag!==6?{children:null}:null):"",/\S/.test(w)?console.error(`In HTML, text nodes cannot be a child of <%s>.
This will cause a hydration error.%s`,v,g):console.error(`In HTML, whitespace text nodes cannot be a child of <%s>. Make sure you don't have any extra whitespace between tags on each line of your source code.
This will cause a hydration error.%s`,v,g),!1}function K4(w,v){if(v){var g=w.firstChild;if(g&&g===w.lastChild&&g.nodeType===3){g.nodeValue=v;return}}w.textContent=v}function Yq(w){return w.replace(RK,function(v,g){return g.toUpperCase()})}function cG(w,v,g){var x=v.indexOf("--")===0;x||(-1<v.indexOf("-")?Rg.hasOwnProperty(v)&&Rg[v]||(Rg[v]=!0,console.error("Unsupported style property %s. Did you mean %s?",v,Yq(v.replace(OK,"ms-")))):AK.test(v)?Rg.hasOwnProperty(v)&&Rg[v]||(Rg[v]=!0,console.error("Unsupported vendor-prefixed style property %s. Did you mean %s?",v,v.charAt(0).toUpperCase()+v.slice(1))):!oH.test(g)||a9.hasOwnProperty(g)&&a9[g]||(a9[g]=!0,console.error(`Style property values shouldn't contain a semicolon. Try "%s: %s" instead.`,v,g.replace(oH,""))),typeof g==="number"&&(isNaN(g)?tH||(tH=!0,console.error("`NaN` is an invalid value for the `%s` css style property.",v)):isFinite(g)||pH||(pH=!0,console.error("`Infinity` is an invalid value for the `%s` css style property.",v)))),g==null||typeof g==="boolean"||g===""?x?w.setProperty(v,""):v==="float"?w.cssFloat="":w[v]="":x?w.setProperty(v,g):typeof g!=="number"||g===0||eH.has(v)?v==="float"?w.cssFloat=g:(J4(g,v),w[v]=(""+g).trim()):w[v]=g+"px"}function sG(w,v,g){if(v!=null&&typeof v!=="object")throw Error("The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX.");if(v&&Object.freeze(v),w=w.style,g!=null){if(v){var x={};if(g){for(var z in g)if(g.hasOwnProperty(z)&&!v.hasOwnProperty(z))for(var G=y9[z]||[z],Z=0;Z<G.length;Z++)x[G[Z]]=z}for(var B in v)if(v.hasOwnProperty(B)&&(!g||g[B]!==v[B]))for(z=y9[B]||[B],G=0;G<z.length;G++)x[z[G]]=B;B={};for(var X in v)for(z=y9[X]||[X],G=0;G<z.length;G++)B[z[G]]=X;X={};for(var H in x)if(z=x[H],(G=B[H])&&z!==G&&(Z=z+","+G,!X[Z])){X[Z]=!0,Z=console;var Y=v[z];Z.error.call(Z,"%s a style property during rerender (%s) when a conflicting property is set (%s) can lead to styling bugs. To avoid this, don't mix shorthand and non-shorthand properties for the same value; instead, replace the shorthand with separate values.",Y==null||typeof Y==="boolean"||Y===""?"Removing":"Updating",z,G)}}for(var L in g)!g.hasOwnProperty(L)||v!=null&&v.hasOwnProperty(L)||(L.indexOf("--")===0?w.setProperty(L,""):L==="float"?w.cssFloat="":w[L]="");for(var U in v)H=v[U],v.hasOwnProperty(U)&&g[U]!==H&&cG(w,U,H)}else for(x in v)v.hasOwnProperty(x)&&cG(w,x,v[x])}function W4(w){if(w.indexOf("-")===-1)return!1;switch(w){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}function iG(w){return VK.get(w)||w}function Lq(w,v){if(v1.call(Dg,v)&&Dg[v])return!0;if(kK.test(v)){if(w="aria-"+v.slice(4).toLowerCase(),w=wJ.hasOwnProperty(w)?w:null,w==null)return console.error("Invalid ARIA attribute `%s`. ARIA attributes follow the pattern aria-* and must be lowercase.",v),Dg[v]=!0;if(v!==w)return console.error("Invalid ARIA attribute `%s`. Did you mean `%s`?",v,w),Dg[v]=!0}if(DK.test(v)){if(w=v.toLowerCase(),w=wJ.hasOwnProperty(w)?w:null,w==null)return Dg[v]=!0,!1;v!==w&&(console.error("Unknown ARIA attribute `%s`. Did you mean `%s`?",v,w),Dg[v]=!0)}return!0}function Iq(w,v){var g=[],x;for(x in v)Lq(w,x)||g.push(x);v=g.map(function(z){return"`"+z+"`"}).join(", "),g.length===1?console.error("Invalid aria prop %s on <%s> tag. For details, see https://react.dev/link/invalid-aria-props",v,w):1<g.length&&console.error("Invalid aria props %s on <%s> tag. For details, see https://react.dev/link/invalid-aria-props",v,w)}function bq(w,v,g,x){if(v1.call(iw,v)&&iw[v])return!0;var z=v.toLowerCase();if(z==="onfocusin"||z==="onfocusout")return console.error("React uses onFocus and onBlur instead of onFocusIn and onFocusOut. All React events are normalized to bubble, so onFocusIn and onFocusOut are not needed/supported by React."),iw[v]=!0;if(typeof g==="function"&&(w==="form"&&v==="action"||w==="input"&&v==="formAction"||w==="button"&&v==="formAction"))return!0;if(x!=null){if(w=x.possibleRegistrationNames,x.registrationNameDependencies.hasOwnProperty(v))return!0;if(x=w.hasOwnProperty(z)?w[z]:null,x!=null)return console.error("Invalid event handler property `%s`. Did you mean `%s`?",v,x),iw[v]=!0;if(gJ.test(v))return console.error("Unknown event handler property `%s`. It will be ignored.",v),iw[v]=!0}else if(gJ.test(v))return FK.test(v)&&console.error("Invalid event handler property `%s`. React events use the camelCase naming convention, for example `onClick`.",v),iw[v]=!0;if(hK.test(v)||PK.test(v))return!0;if(z==="innerhtml")return console.error("Directly setting property `innerHTML` is not permitted. For more information, lookup documentation on `dangerouslySetInnerHTML`."),iw[v]=!0;if(z==="aria")return console.error("The `aria` attribute is reserved for future use in React. Pass individual `aria-` attributes instead."),iw[v]=!0;if(z==="is"&&g!==null&&g!==void 0&&typeof g!=="string")return console.error("Received a `%s` for a string attribute `is`. If this is expected, cast the value to a string.",typeof g),iw[v]=!0;if(typeof g==="number"&&isNaN(g))return console.error("Received NaN for the `%s` attribute. If this is expected, cast the value to a string.",v),iw[v]=!0;if(U6.hasOwnProperty(z)){if(z=U6[z],z!==v)return console.error("Invalid DOM property `%s`. Did you mean `%s`?",v,z),iw[v]=!0}else if(v!==z)return console.error("React does not recognize the `%s` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `%s` instead. If you accidentally passed it from a parent component, remove it from the DOM element.",v,z),iw[v]=!0;switch(v){case"dangerouslySetInnerHTML":case"children":case"style":case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":return!0;case"innerText":case"textContent":return!0}switch(typeof g){case"boolean":switch(v){case"autoFocus":case"checked":case"multiple":case"muted":case"selected":case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":case"capture":case"download":case"inert":return!0;default:if(z=v.toLowerCase().slice(0,5),z==="data-"||z==="aria-")return!0;return g?console.error('Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.',g,v,v,g,v):console.error('Received `%s` for a non-boolean attribute `%s`.\n\nIf you want to write it to the DOM, pass a string instead: %s="%s" or %s={value.toString()}.\n\nIf you used to conditionally omit it with %s={condition && value}, pass %s={condition ? value : undefined} instead.',g,v,v,g,v,v,v),iw[v]=!0}case"function":case"symbol":return iw[v]=!0,!1;case"string":if(g==="false"||g==="true"){switch(v){case"checked":case"selected":case"multiple":case"muted":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":case"inert":break;default:return!0}console.error("Received the string `%s` for the boolean attribute `%s`. %s Did you mean %s={%s}?",g,v,g==="false"?"The browser will interpret it as a truthy value.":'Although this works, it will not work as expected if you pass the string "false".',v,g),iw[v]=!0}}return!0}function jq(w,v,g){var x=[],z;for(z in v)bq(w,z,v[z],g)||x.push(z);v=x.map(function(G){return"`"+G+"`"}).join(", "),x.length===1?console.error("Invalid value for prop %s on <%s> tag. Either remove it from the element, or pass a string or number value to keep it in the DOM. For details, see https://react.dev/link/attribute-behavior ",v,w):1<x.length&&console.error("Invalid values for props %s on <%s> tag. Either remove them from the element, or pass a string or number value to keep them in the DOM. For details, see https://react.dev/link/attribute-behavior ",v,w)}function M4(w){return CK.test(""+w)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":w}function l1(){}function h8(w){return w=w.target||w.srcElement||window,w.correspondingUseElement&&(w=w.correspondingUseElement),w.nodeType===3?w.parentNode:w}function rG(w){var v=$0(w);if(v&&(w=v.stateNode)){var g=w[sw]||null;w:switch(w=v.stateNode,v.type){case"input":if(A8(w,g.value,g.defaultValue,g.defaultValue,g.checked,g.defaultChecked,g.type,g.name),v=g.name,g.type==="radio"&&v!=null){for(g=w;g.parentNode;)g=g.parentNode;u0(v,"name"),g=g.querySelectorAll('input[name="'+f2(""+v)+'"][type="radio"]');for(v=0;v<g.length;v++){var x=g[v];if(x!==w&&x.form===w.form){var z=x[sw]||null;if(!z)throw Error("ReactDOMInput: Mixing React and non-React radio inputs with the same `name` is not supported.");A8(x,z.value,z.defaultValue,z.defaultValue,z.checked,z.defaultChecked,z.type,z.name)}}for(v=0;v<g.length;v++)x=g[v],x.form===w.form&&FG(x)}break w;case"textarea":NG(w,g.value,g.defaultValue);break w;case"select":v=g.value,v!=null&&xg(w,!!g.multiple,v,!1)}}}function nG(w,v,g){if(c9)return w(v,g);c9=!0;try{var x=w(v);return x}finally{if(c9=!1,kg!==null||Fg!==null){if(Kg(),kg&&(v=kg,w=Fg,Fg=kg=null,rG(v),w))for(v=0;v<w.length;v++)rG(w[v])}}}function Y4(w,v){var g=w.stateNode;if(g===null)return null;var x=g[sw]||null;if(x===null)return null;g=x[v];w:switch(v){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(x=!x.disabled)||(w=w.type,x=!(w==="button"||w==="input"||w==="select"||w==="textarea")),w=!x;break w;default:w=!1}if(w)return null;if(g&&typeof g!=="function")throw Error("Expected `"+v+"` listener to be a function, instead got a value of `"+typeof g+"` type.");return g}function oG(){if(K6)return K6;var w,v=i9,g=v.length,x,z="value"in _5?_5.value:_5.textContent,G=z.length;for(w=0;w<g&&v[w]===z[w];w++);var Z=g-w;for(x=1;x<=Z&&v[g-x]===z[G-x];x++);return K6=z.slice(w,1<x?1-x:void 0)}function g3(w){var v=w.keyCode;return"charCode"in w?(w=w.charCode,w===0&&v===13&&(w=13)):w=v,w===10&&(w=13),32<=w||w===13?w:0}function x3(){return!0}function tG(){return!1}function G2(w){function v(g,x,z,G,Z){this._reactName=g,this._targetInst=z,this.type=x,this.nativeEvent=G,this.target=Z,this.currentTarget=null;for(var B in w)w.hasOwnProperty(B)&&(g=w[B],this[B]=g?g(G):G[B]);return this.isDefaultPrevented=(G.defaultPrevented!=null?G.defaultPrevented:G.returnValue===!1)?x3:tG,this.isPropagationStopped=tG,this}return O0(v.prototype,{preventDefault:function(){this.defaultPrevented=!0;var g=this.nativeEvent;g&&(g.preventDefault?g.preventDefault():typeof g.returnValue!=="unknown"&&(g.returnValue=!1),this.isDefaultPrevented=x3)},stopPropagation:function(){var g=this.nativeEvent;g&&(g.stopPropagation?g.stopPropagation():typeof g.cancelBubble!=="unknown"&&(g.cancelBubble=!0),this.isPropagationStopped=x3)},persist:function(){},isPersistent:x3}),v}function Aq(w){var v=this.nativeEvent;return v.getModifierState?v.getModifierState(w):(w=cK[w])?!!v[w]:!1}function P8(){return Aq}function pG(w,v){switch(w){case"keyup":return xW.indexOf(v.keyCode)!==-1;case"keydown":return v.keyCode!==ZJ;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function eG(w){return w=w.detail,typeof w==="object"&&"data"in w?w.data:null}function Oq(w,v){switch(w){case"compositionend":return eG(v);case"keypress":if(v.which!==XJ)return null;return JJ=!0,HJ;case"textInput":return w=v.data,w===HJ&&JJ?null:w;default:return null}}function Rq(w,v){if(hg)return w==="compositionend"||!t9&&pG(w,v)?(w=oG(),K6=i9=_5=null,hg=!1,w):null;switch(w){case"paste":return null;case"keypress":if(!(v.ctrlKey||v.altKey||v.metaKey)||v.ctrlKey&&v.altKey){if(v.char&&1<v.char.length)return v.char;if(v.which)return String.fromCharCode(v.which)}return null;case"compositionend":return BJ&&v.locale!=="ko"?null:v.data;default:return null}}function wZ(w){var v=w&&w.nodeName&&w.nodeName.toLowerCase();return v==="input"?!!GW[w.type]:v==="textarea"?!0:!1}function Vq(w){if(!E1)return!1;w="on"+w;var v=w in document;return v||(v=document.createElement("div"),v.setAttribute(w,"return;"),v=typeof v[w]==="function"),v}function vZ(w,v,g,x){kg?Fg?Fg.push(x):Fg=[x]:kg=x,v=n3(v,"onChange"),0<v.length&&(g=new W6("onChange","change",null,g,x),w.push({event:g,listeners:v}))}function Dq(w){SX(w,0)}function z3(w){var v=q0(w);if(FG(v))return w}function gZ(w,v){if(w==="change")return v}function xZ(){xx&&(xx.detachEvent("onpropertychange",zZ),zx=xx=null)}function zZ(w){if(w.propertyName==="value"&&z3(zx)){var v=[];vZ(v,zx,w,h8(w)),nG(Dq,v)}}function kq(w,v,g){w==="focusin"?(xZ(),xx=v,zx=g,xx.attachEvent("onpropertychange",zZ)):w==="focusout"&&xZ()}function Fq(w){if(w==="selectionchange"||w==="keyup"||w==="keydown")return z3(zx)}function hq(w,v){if(w==="click")return z3(v)}function Pq(w,v){if(w==="input"||w==="change")return z3(v)}function Cq(w,v){return w===v&&(w!==0||1/w===1/v)||w!==w&&v!==v}function L4(w,v){if(rw(w,v))return!0;if(typeof w!=="object"||w===null||typeof v!=="object"||v===null)return!1;var g=Object.keys(w),x=Object.keys(v);if(g.length!==x.length)return!1;for(x=0;x<g.length;x++){var z=g[x];if(!v1.call(v,z)||!rw(w[z],v[z]))return!1}return!0}function GZ(w){for(;w&&w.firstChild;)w=w.firstChild;return w}function ZZ(w,v){var g=GZ(w);w=0;for(var x;g;){if(g.nodeType===3){if(x=w+g.textContent.length,w<=v&&x>=v)return{node:g,offset:v-w};w=x}w:{for(;g;){if(g.nextSibling){g=g.nextSibling;break w}g=g.parentNode}g=void 0}g=GZ(g)}}function BZ(w,v){return w&&v?w===v?!0:w&&w.nodeType===3?!1:v&&v.nodeType===3?BZ(w,v.parentNode):("contains"in w)?w.contains(v):w.compareDocumentPosition?!!(w.compareDocumentPosition(v)&16):!1:!1}function XZ(w){w=w!=null&&w.ownerDocument!=null&&w.ownerDocument.defaultView!=null?w.ownerDocument.defaultView:window;for(var v=ex(w.document);v instanceof w.HTMLIFrameElement;){try{var g=typeof v.contentWindow.location.href==="string"}catch(x){g=!1}if(g)w=v.contentWindow;else break;v=ex(w.document)}return v}function C8(w){var v=w&&w.nodeName&&w.nodeName.toLowerCase();return v&&(v==="input"&&(w.type==="text"||w.type==="search"||w.type==="tel"||w.type==="url"||w.type==="password")||v==="textarea"||w.contentEditable==="true")}function HZ(w,v,g){var x=g.window===g?g.document:g.nodeType===9?g:g.ownerDocument;e9||Pg==null||Pg!==ex(x)||(x=Pg,("selectionStart"in x)&&C8(x)?x={start:x.selectionStart,end:x.selectionEnd}:(x=(x.ownerDocument&&x.ownerDocument.defaultView||window).getSelection(),x={anchorNode:x.anchorNode,anchorOffset:x.anchorOffset,focusNode:x.focusNode,focusOffset:x.focusOffset}),Gx&&L4(Gx,x)||(Gx=x,x=n3(p9,"onSelect"),0<x.length&&(v=new W6("onSelect","select",null,v,g),w.push({event:v,listeners:x}),v.target=Pg)))}function Uv(w,v){var g={};return g[w.toLowerCase()]=v.toLowerCase(),g["Webkit"+w]="webkit"+v,g["Moz"+w]="moz"+v,g}function Kv(w){if(wz[w])return wz[w];if(!Cg[w])return w;var v=Cg[w],g;for(g in v)if(v.hasOwnProperty(g)&&g in $J)return wz[w]=v[g];return w}function p2(w,v){MJ.set(w,v),dw(v,[w])}function _q(w){for(var v=Y6,g=0;g<w.length;g++){var x=w[g];if(typeof x==="object"&&x!==null)if(Ow(x)&&x.length===2&&typeof x[0]==="string"){if(v!==Y6&&v!==Gz)return xz;v=Gz}else return xz;else{if(typeof x==="function"||typeof x==="string"&&50<x.length||v!==Y6&&v!==zz)return xz;v=zz}}return v}function _8(w,v,g,x){for(var z in w)v1.call(w,z)&&z[0]!=="_"&&q1(z,w[z],v,g,x)}function q1(w,v,g,x,z){switch(typeof v){case"object":if(v===null){v="null";break}else{if(v.$$typeof===F1){var G=b0(v.type)||"…",Z=v.key;v=v.props;var B=Object.keys(v),X=B.length;if(Z==null&&X===0){v="<"+G+" />";break}if(3>x||X===1&&B[0]==="children"&&Z==null){v="<"+G+" … />";break}g.push([z+"  ".repeat(x)+w,"<"+G]),Z!==null&&q1("key",Z,g,x+1,z),w=!1;for(var H in v)H==="children"?v.children!=null&&(!Ow(v.children)||0<v.children.length)&&(w=!0):v1.call(v,H)&&H[0]!=="_"&&q1(H,v[H],g,x+1,z);g.push(["",w?">…</"+G+">":"/>"]);return}if(G=Object.prototype.toString.call(v),G=G.slice(8,G.length-1),G==="Array"){if(H=_q(v),H===zz||H===Y6){v=JSON.stringify(v);break}else if(H===Gz){g.push([z+"  ".repeat(x)+w,""]);for(w=0;w<v.length;w++)G=v[w],q1(G[0],G[1],g,x+1,z);return}}if(G==="Promise"){if(v.status==="fulfilled"){if(G=g.length,q1(w,v.value,g,x,z),g.length>G){g=g[G],g[1]="Promise<"+(g[1]||"Object")+">";return}}else if(v.status==="rejected"&&(G=g.length,q1(w,v.reason,g,x,z),g.length>G)){g=g[G],g[1]="Rejected Promise<"+g[1]+">";return}g.push(["  ".repeat(x)+w,"Promise"]);return}G==="Object"&&(H=Object.getPrototypeOf(v))&&typeof H.constructor==="function"&&(G=H.constructor.name),g.push([z+"  ".repeat(x)+w,G==="Object"?3>x?"":"…":G]),3>x&&_8(v,g,x+1,z);return}case"function":v=v.name===""?"() => {}":v.name+"() {}";break;case"string":v=v===$W?"…":JSON.stringify(v);break;case"undefined":v="undefined";break;case"boolean":v=v?"true":"false";break;default:v=String(v)}g.push([z+"  ".repeat(x)+w,v])}function JZ(w,v,g,x){var z=!0;for(Z in w)Z in v||(g.push([L6+"  ".repeat(x)+Z,"…"]),z=!1);for(var G in v)if(G in w){var Z=w[G],B=v[G];if(Z!==B){if(x===0&&G==="children")z="  ".repeat(x)+G,g.push([L6+z,"…"],[I6+z,"…"]);else{if(!(3<=x)){if(typeof Z==="object"&&typeof B==="object"&&Z!==null&&B!==null&&Z.$$typeof===B.$$typeof)if(B.$$typeof===F1){if(Z.type===B.type&&Z.key===B.key){Z=b0(B.type)||"…",z="  ".repeat(x)+G,Z="<"+Z+" … />",g.push([L6+z,Z],[I6+z,Z]),z=!1;continue}}else{var X=Object.prototype.toString.call(Z),H=Object.prototype.toString.call(B);if(X===H&&(H==="[object Object]"||H==="[object Array]")){X=[IJ+"  ".repeat(x)+G,H==="[object Array]"?"Array":""],g.push(X),H=g.length,JZ(Z,B,g,x+1)?H===g.length&&(X[1]="Referentially unequal but deeply equal objects. Consider memoization."):z=!1;continue}}else if(typeof Z==="function"&&typeof B==="function"&&Z.name===B.name&&Z.length===B.length&&(X=Function.prototype.toString.call(Z),H=Function.prototype.toString.call(B),X===H)){Z=B.name===""?"() => {}":B.name+"() {}",g.push([IJ+"  ".repeat(x)+G,Z+" Referentially unequal function closure. Consider memoization."]);continue}}q1(G,Z,g,x,L6),q1(G,B,g,x,I6)}z=!1}}else g.push([I6+"  ".repeat(x)+G,"…"]),z=!1;return z}function W2(w){V0=w&63?"Blocking":w&64?"Gesture":w&4194176?"Transition":w&62914560?"Suspense":w&2080374784?"Idle":"Other"}function U1(w,v,g,x){t0&&(E5.start=v,E5.end=g,t1.color="warning",t1.tooltipText=x,t1.properties=null,(w=w._debugTask)?w.run(performance.measure.bind(performance,x,E5)):performance.measure(x,E5))}function G3(w,v,g){U1(w,v,g,"Reconnect")}function Z3(w,v,g,x,z){var G=l(w);if(G!==null&&t0){var{alternate:Z,actualDuration:B}=w;if(Z===null||Z.child!==w.child)for(var X=w.child;X!==null;X=X.sibling)B-=X.actualDuration;x=0.5>B?x?"tertiary-light":"primary-light":10>B?x?"tertiary":"primary":100>B?x?"tertiary-dark":"primary-dark":"error";var H=w.memoizedProps;B=w._debugTask,H!==null&&Z!==null&&Z.memoizedProps!==H?(X=[qW],H=JZ(Z.memoizedProps,H,X,0),1<X.length&&(H&&!f5&&(Z.lanes&z)===0&&100<w.actualDuration?(f5=!0,X[0]=UW,t1.color="warning",t1.tooltipText=bJ):(t1.color=x,t1.tooltipText=G),t1.properties=X,E5.start=v,E5.end=g,B!=null?B.run(performance.measure.bind(performance,"​"+G,E5)):performance.measure("​"+G,E5))):B!=null?B.run(console.timeStamp.bind(console,G,v,g,N2,void 0,x)):console.timeStamp(G,v,g,N2,void 0,x)}}function f8(w,v,g,x){if(t0){var z=l(w);if(z!==null){for(var G=null,Z=[],B=0;B<x.length;B++){var X=x[B];G==null&&X.source!==null&&(G=X.source._debugTask),X=X.value,Z.push(["Error",typeof X==="object"&&X!==null&&typeof X.message==="string"?String(X.message):String(X)])}w.key!==null&&q1("key",w.key,Z,0,""),w.memoizedProps!==null&&_8(w.memoizedProps,Z,0,""),G==null&&(G=w._debugTask),w={start:v,end:g,detail:{devtools:{color:"error",track:N2,tooltipText:w.tag===13?"Hydration failed":"Error boundary caught an error",properties:Z}}},G?G.run(performance.measure.bind(performance,"​"+z,w)):performance.measure("​"+z,w)}}}function K1(w,v,g,x,z){if(z!==null){if(t0){var G=l(w);if(G!==null){x=[];for(var Z=0;Z<z.length;Z++){var B=z[Z].value;x.push(["Error",typeof B==="object"&&B!==null&&typeof B.message==="string"?String(B.message):String(B)])}w.key!==null&&q1("key",w.key,x,0,""),w.memoizedProps!==null&&_8(w.memoizedProps,x,0,""),v={start:v,end:g,detail:{devtools:{color:"error",track:N2,tooltipText:"A lifecycle or effect errored",properties:x}}},(w=w._debugTask)?w.run(performance.measure.bind(performance,"​"+G,v)):performance.measure("​"+G,v)}}}else G=l(w),G!==null&&t0&&(z=1>x?"secondary-light":100>x?"secondary":500>x?"secondary-dark":"error",(w=w._debugTask)?w.run(console.timeStamp.bind(console,G,v,g,N2,void 0,z)):console.timeStamp(G,v,g,N2,void 0,z))}function fq(w,v,g,x){if(t0&&!(v<=w)){var z=(g&738197653)===g?"tertiary-dark":"primary-dark";g=(g&536870912)===g?"Prepared":(g&201326741)===g?"Hydrated":"Render",x?x.run(console.timeStamp.bind(console,g,w,v,V0,R0,z)):console.timeStamp(g,w,v,V0,R0,z)}}function QZ(w,v,g,x){!t0||v<=w||(g=(g&738197653)===g?"tertiary-dark":"primary-dark",x?x.run(console.timeStamp.bind(console,"Prewarm",w,v,V0,R0,g)):console.timeStamp("Prewarm",w,v,V0,R0,g))}function $Z(w,v,g,x){!t0||v<=w||(g=(g&738197653)===g?"tertiary-dark":"primary-dark",x?x.run(console.timeStamp.bind(console,"Suspended",w,v,V0,R0,g)):console.timeStamp("Suspended",w,v,V0,R0,g))}function Eq(w,v,g,x,z,G){if(t0&&!(v<=w)){g=[];for(var Z=0;Z<x.length;Z++){var B=x[Z].value;g.push(["Recoverable Error",typeof B==="object"&&B!==null&&typeof B.message==="string"?String(B.message):String(B)])}w={start:w,end:v,detail:{devtools:{color:"primary-dark",track:V0,trackGroup:R0,tooltipText:z?"Hydration Failed":"Recovered after Error",properties:g}}},G?G.run(performance.measure.bind(performance,"Recovered",w)):performance.measure("Recovered",w)}}function E8(w,v,g,x){!t0||v<=w||(x?x.run(console.timeStamp.bind(console,"Errored",w,v,V0,R0,"error")):console.timeStamp("Errored",w,v,V0,R0,"error"))}function Nq(w,v,g,x){!t0||v<=w||(x?x.run(console.timeStamp.bind(console,g,w,v,V0,R0,"secondary-light")):console.timeStamp(g,w,v,V0,R0,"secondary-light"))}function qZ(w,v,g,x,z){if(t0&&!(v<=w)){for(var G=[],Z=0;Z<g.length;Z++){var B=g[Z].value;G.push(["Error",typeof B==="object"&&B!==null&&typeof B.message==="string"?String(B.message):String(B)])}w={start:w,end:v,detail:{devtools:{color:"error",track:V0,trackGroup:R0,tooltipText:x?"Remaining Effects Errored":"Commit Errored",properties:G}}},z?z.run(performance.measure.bind(performance,"Errored",w)):performance.measure("Errored",w)}}function I4(w,v,g){!t0||v<=w||(g?g.run(console.timeStamp.bind(console,"Animating",w,v,V0,R0,"secondary-dark")):console.timeStamp("Animating",w,v,V0,R0,"secondary-dark"))}function B3(){for(var w=_g,v=Zz=_g=0;v<w;){var g=S2[v];S2[v++]=null;var x=S2[v];S2[v++]=null;var z=S2[v];S2[v++]=null;var G=S2[v];if(S2[v++]=null,x!==null&&z!==null){var Z=x.pending;Z===null?z.next=z:(z.next=Z.next,Z.next=z),x.pending=z}G!==0&&UZ(g,z,G)}}function X3(w,v,g,x){S2[_g++]=w,S2[_g++]=v,S2[_g++]=g,S2[_g++]=x,Zz|=x,w.lanes|=x,w=w.alternate,w!==null&&(w.lanes|=x)}function N8(w,v,g,x){return X3(w,v,g,x),H3(w)}function Tw(w,v){return X3(w,null,null,v),H3(w)}function UZ(w,v,g){w.lanes|=g;var x=w.alternate;x!==null&&(x.lanes|=g);for(var z=!1,G=w.return;G!==null;)G.childLanes|=g,x=G.alternate,x!==null&&(x.childLanes|=g),G.tag===22&&(w=G.stateNode,w===null||w._visibility&Zx||(z=!0)),w=G,G=G.return;return w.tag===3?(G=w.stateNode,z&&v!==null&&(z=31-cw(g),w=G.hiddenUpdates,x=w[z],x===null?w[z]=[v]:x.push(v),v.lane=g|536870912),G):null}function H3(w){if(_x>FW)throw av=_x=0,fx=Tz=null,Error("Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.");av>hW&&(av=0,fx=null,console.error("Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.")),w.alternate===null&&(w.flags&4098)!==0&&hX(w);for(var v=w,g=v.return;g!==null;)v.alternate===null&&(v.flags&4098)!==0&&hX(w),v=g,g=v.return;return v.tag===3?v.stateNode:null}function Wv(w){if(d2===null)return w;var v=d2(w);return v===void 0?w:v.current}function S8(w){if(d2===null)return w;var v=d2(w);return v===void 0?w!==null&&w!==void 0&&typeof w.render==="function"&&(v=Wv(w.render),w.render!==v)?(v={$$typeof:r4,render:v},w.displayName!==void 0&&(v.displayName=w.displayName),v):w:v.current}function KZ(w,v){if(d2===null)return!1;var g=w.elementType;v=v.type;var x=!1,z=typeof v==="object"&&v!==null?v.$$typeof:null;switch(w.tag){case 1:typeof v==="function"&&(x=!0);break;case 0:typeof v==="function"?x=!0:z===A2&&(x=!0);break;case 11:z===r4?x=!0:z===A2&&(x=!0);break;case 14:case 15:z===Z6?x=!0:z===A2&&(x=!0);break;default:return!1}return x&&(w=d2(g),w!==void 0&&w===d2(v))?!0:!1}function WZ(w){d2!==null&&typeof WeakSet==="function"&&(fg===null&&(fg=new WeakSet),fg.add(w))}function MZ(w,v,g){do{var x=w,z=x.alternate,G=x.child,Z=x.sibling,B=x.tag;x=x.type;var X=null;switch(B){case 0:case 15:case 1:X=x;break;case 11:X=x.render}if(d2===null)throw Error("Expected resolveFamily to be set during hot reload.");var H=!1;if(x=!1,X!==null&&(X=d2(X),X!==void 0&&(g.has(X)?x=!0:v.has(X)&&(B===1?x=!0:H=!0))),fg!==null&&(fg.has(w)||z!==null&&fg.has(z))&&(x=!0),x&&(w._debugNeedsRemount=!0),x||H)z=Tw(w,2),z!==null&&Bw(z,w,2);if(G===null||x||MZ(G,v,g),Z===null)break;w=Z}while(1)}function Sq(w,v,g,x){this.tag=w,this.key=g,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.refCleanup=this.ref=null,this.pendingProps=v,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=x,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null,this.actualDuration=-0,this.actualStartTime=-1.1,this.treeBaseDuration=this.selfBaseDuration=-0,this._debugTask=this._debugStack=this._debugOwner=this._debugInfo=null,this._debugNeedsRemount=!1,this._debugHookTypes=null,jJ||typeof Object.preventExtensions!=="function"||Object.preventExtensions(this)}function d8(w){return w=w.prototype,!(!w||!w.isReactComponent)}function y1(w,v){var g=w.alternate;switch(g===null?(g=E(w.tag,v,w.key,w.mode),g.elementType=w.elementType,g.type=w.type,g.stateNode=w.stateNode,g._debugOwner=w._debugOwner,g._debugStack=w._debugStack,g._debugTask=w._debugTask,g._debugHookTypes=w._debugHookTypes,g.alternate=w,w.alternate=g):(g.pendingProps=v,g.type=w.type,g.flags=0,g.subtreeFlags=0,g.deletions=null,g.actualDuration=-0,g.actualStartTime=-1.1),g.flags=w.flags&65011712,g.childLanes=w.childLanes,g.lanes=w.lanes,g.child=w.child,g.memoizedProps=w.memoizedProps,g.memoizedState=w.memoizedState,g.updateQueue=w.updateQueue,v=w.dependencies,g.dependencies=v===null?null:{lanes:v.lanes,firstContext:v.firstContext,_debugThenableState:v._debugThenableState},g.sibling=w.sibling,g.index=w.index,g.ref=w.ref,g.refCleanup=w.refCleanup,g.selfBaseDuration=w.selfBaseDuration,g.treeBaseDuration=w.treeBaseDuration,g._debugInfo=w._debugInfo,g._debugNeedsRemount=w._debugNeedsRemount,g.tag){case 0:case 15:g.type=Wv(w.type);break;case 1:g.type=Wv(w.type);break;case 11:g.type=S8(w.type)}return g}function YZ(w,v){w.flags&=65011714;var g=w.alternate;return g===null?(w.childLanes=0,w.lanes=v,w.child=null,w.subtreeFlags=0,w.memoizedProps=null,w.memoizedState=null,w.updateQueue=null,w.dependencies=null,w.stateNode=null,w.selfBaseDuration=0,w.treeBaseDuration=0):(w.childLanes=g.childLanes,w.lanes=g.lanes,w.child=g.child,w.subtreeFlags=0,w.deletions=null,w.memoizedProps=g.memoizedProps,w.memoizedState=g.memoizedState,w.updateQueue=g.updateQueue,w.type=g.type,v=g.dependencies,w.dependencies=v===null?null:{lanes:v.lanes,firstContext:v.firstContext,_debugThenableState:v._debugThenableState},w.selfBaseDuration=g.selfBaseDuration,w.treeBaseDuration=g.treeBaseDuration),w}function T8(w,v,g,x,z,G){var Z=0,B=w;if(typeof w==="function")d8(w)&&(Z=1),B=Wv(B);else if(typeof w==="string")Z=S(),Z=sU(w,g,Z)?26:w==="html"||w==="head"||w==="body"?27:5;else w:switch(w){case P9:return v=E(31,g,v,z),v.elementType=P9,v.lanes=G,v;case jg:return Mv(g.children,z,G,v);case G6:Z=8,z|=uw,z|=x1;break;case D9:return w=g,x=z,typeof w.id!=="string"&&console.error('Profiler must specify an "id" of type `string` as a prop. Received the type `%s` instead.',typeof w.id),v=E(12,w,v,x|Y0),v.elementType=D9,v.lanes=G,v.stateNode={effectDuration:0,passiveEffectDuration:0},v;case F9:return v=E(13,g,v,z),v.elementType=F9,v.lanes=G,v;case h9:return v=E(19,g,v,z),v.elementType=h9,v.lanes=G,v;default:if(typeof w==="object"&&w!==null)switch(w.$$typeof){case h1:Z=10;break w;case k9:Z=9;break w;case r4:Z=11,B=S8(B);break w;case Z6:Z=14;break w;case A2:Z=16,B=null;break w}if(B="",w===void 0||typeof w==="object"&&w!==null&&Object.keys(w).length===0)B+=" You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";w===null?g="null":Ow(w)?g="array":w!==void 0&&w.$$typeof===F1?(g="<"+(b0(w.type)||"Unknown")+" />",B=" Did you accidentally export a JSX literal instead of a component?"):g=typeof w,(Z=x?Zw(x):null)&&(B+=`

Check the render method of \``+Z+"`."),Z=29,g=Error("Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: "+(g+"."+B)),B=null}return v=E(Z,g,v,z),v.elementType=w,v.type=B,v.lanes=G,v._debugOwner=x,v}function J3(w,v,g){return v=T8(w.type,w.key,w.props,w._owner,v,g),v._debugOwner=w._owner,v._debugStack=w._debugStack,v._debugTask=w._debugTask,v}function Mv(w,v,g,x){return w=E(7,w,x,v),w.lanes=g,w}function m8(w,v,g){return w=E(6,w,null,v),w.lanes=g,w}function LZ(w){var v=E(18,null,null,B0);return v.stateNode=w,v}function u8(w,v,g){return v=E(4,w.children!==null?w.children:[],w.key,v),v.lanes=g,v.stateNode={containerInfo:w.containerInfo,pendingChildren:null,implementation:w.implementation},v}function M2(w,v){if(typeof w==="object"&&w!==null){var g=Bz.get(w);if(g!==void 0)return g;return v={value:w,source:v,stack:yw(v)},Bz.set(w,v),v}return{value:w,source:v,stack:yw(v)}}function a1(w,v){M5(),Eg[Ng++]=Bx,Eg[Ng++]=b6,b6=w,Bx=v}function IZ(w,v,g){M5(),T2[m2++]=e1,T2[m2++]=w5,T2[m2++]=hv,hv=w;var x=e1;w=w5;var z=32-cw(x)-1;x&=~(1<<z),g+=1;var G=32-cw(v)+z;if(30<G){var Z=z-z%5;G=(x&(1<<Z)-1).toString(32),x>>=Z,z-=Z,e1=1<<32-cw(v)+z|g<<z|x,w5=G+w}else e1=1<<G|g<<z|x,w5=w}function l8(w){M5(),w.return!==null&&(a1(w,1),IZ(w,1,0))}function y8(w){for(;w===b6;)b6=Eg[--Ng],Eg[Ng]=null,Bx=Eg[--Ng],Eg[Ng]=null;for(;w===hv;)hv=T2[--m2],T2[m2]=null,w5=T2[--m2],T2[m2]=null,e1=T2[--m2],T2[m2]=null}function bZ(){return M5(),hv!==null?{id:e1,overflow:w5}:null}function jZ(w,v){M5(),T2[m2++]=e1,T2[m2++]=w5,T2[m2++]=hv,e1=v.id,w5=v.overflow,hv=w}function M5(){D0||console.error("Expected to be hydrating. This is a bug in React. Please file an issue.")}function Yv(w,v){if(w.return===null){if(V2===null)V2={fiber:w,children:[],serverProps:void 0,serverTail:[],distanceFromLeaf:v};else{if(V2.fiber!==w)throw Error("Saw multiple hydration diff roots in a pass. This is a bug in React.");V2.distanceFromLeaf>v&&(V2.distanceFromLeaf=v)}return V2}var g=Yv(w.return,v+1).children;if(0<g.length&&g[g.length-1].fiber===w)return g=g[g.length-1],g.distanceFromLeaf>v&&(g.distanceFromLeaf=v),g;return v={fiber:w,children:[],serverProps:void 0,serverTail:[],distanceFromLeaf:v},g.push(v),v}function AZ(){D0&&console.error("We should not be hydrating here. This is a bug in React. Please file a bug.")}function Q3(w,v){N1||(w=Yv(w,0),w.serverProps=null,v!==null&&(v=vH(v),w.serverTail.push(v)))}function Y5(w){var v=1<arguments.length&&arguments[1]!==void 0?arguments[1]:!1,g="",x=V2;throw x!==null&&(V2=null,g=k8(x)),b4(M2(Error("Hydration failed because the server rendered "+(v?"text":"HTML")+` didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch \`if (typeof window !== 'undefined')\`.
- Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch`+g),w)),Xz}function OZ(w){var{stateNode:v,type:g,memoizedProps:x}=w;switch(v[Nw]=w,v[sw]=x,H9(g,x),g){case"dialog":F0("cancel",v),F0("close",v);break;case"iframe":case"object":case"embed":F0("load",v);break;case"video":case"audio":for(g=0;g<Ex.length;g++)F0(Ex[g],v);break;case"source":F0("error",v);break;case"img":case"image":case"link":F0("error",v),F0("load",v);break;case"details":F0("toggle",v);break;case"input":W5("input",x),F0("invalid",v),hG(v,x),PG(v,x.value,x.defaultValue,x.checked,x.defaultChecked,x.type,x.name,!0);break;case"option":CG(v,x);break;case"select":W5("select",x),F0("invalid",v),fG(v,x);break;case"textarea":W5("textarea",x),F0("invalid",v),EG(v,x),SG(v,x.value,x.defaultValue,x.children)}g=x.children,typeof g!=="string"&&typeof g!=="number"&&typeof g!=="bigint"||v.textContent===""+g||x.suppressHydrationWarning===!0||uX(v.textContent,g)?(x.popover!=null&&(F0("beforetoggle",v),F0("toggle",v)),x.onScroll!=null&&F0("scroll",v),x.onScrollEnd!=null&&F0("scrollend",v),x.onClick!=null&&(v.onclick=l1),v=!0):v=!1,v||Y5(w,!0)}function RZ(w){for(Sw=w.return;Sw;)switch(Sw.tag){case 5:case 31:case 13:u2=!1;return;case 27:case 3:u2=!0;return;default:Sw=Sw.return}}function Zg(w){if(w!==Sw)return!1;if(!D0)return RZ(w),D0=!0,!1;var v=w.tag,g;if(g=v!==3&&v!==27){if(g=v===5)g=w.type,g=!(g!=="form"&&g!=="button")||U9(w.type,w.memoizedProps);g=!g}if(g&&p0){for(g=p0;g;){var x=Yv(w,0),z=vH(g);x.serverTail.push(z),g=z.type==="Suspense"?Y9(g):j2(g.nextSibling)}Y5(w)}if(RZ(w),v===13){if(w=w.memoizedState,w=w!==null?w.dehydrated:null,!w)throw Error("Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue.");p0=Y9(w)}else if(v===31){if(w=w.memoizedState,w=w!==null?w.dehydrated:null,!w)throw Error("Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue.");p0=Y9(w)}else v===27?(v=p0,k5(w.type)?(w=tz,tz=null,p0=w):p0=v):p0=Sw?j2(w.stateNode.nextSibling):null;return!0}function Lv(){p0=Sw=null,N1=D0=!1}function a8(){var w=S5;return w!==null&&(pw===null?pw=w:pw.push.apply(pw,w),S5=null),w}function b4(w){S5===null?S5=[w]:S5.push(w)}function c8(){var w=V2;if(w!==null){V2=null;for(var v=k8(w);0<w.children.length;)w=w.children[0];n(w.fiber,function(){console.error(`A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch \`if (typeof window !== 'undefined')\`.
- Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

%s%s`,"https://react.dev/link/hydration-mismatch",v)})}}function $3(){Sg=j6=null,dg=!1}function L5(w,v,g){h(Hz,v._currentValue,w),v._currentValue=g,h(Jz,v._currentRenderer,w),v._currentRenderer!==void 0&&v._currentRenderer!==null&&v._currentRenderer!==OJ&&console.error("Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported."),v._currentRenderer=OJ}function c1(w,v){w._currentValue=Hz.current;var g=Jz.current;k0(Jz,v),w._currentRenderer=g,k0(Hz,v)}function s8(w,v,g){for(;w!==null;){var x=w.alternate;if((w.childLanes&v)!==v?(w.childLanes|=v,x!==null&&(x.childLanes|=v)):x!==null&&(x.childLanes&v)!==v&&(x.childLanes|=v),w===g)break;w=w.return}w!==g&&console.error("Expected to find the propagation root when scheduling context work. This error is likely caused by a bug in React. Please file an issue.")}function i8(w,v,g,x){var z=w.child;z!==null&&(z.return=w);for(;z!==null;){var G=z.dependencies;if(G!==null){var Z=z.child;G=G.firstContext;w:for(;G!==null;){var B=G;G=z;for(var X=0;X<v.length;X++)if(B.context===v[X]){G.lanes|=g,B=G.alternate,B!==null&&(B.lanes|=g),s8(G.return,g,w),x||(Z=null);break w}G=B.next}}else if(z.tag===18){if(Z=z.return,Z===null)throw Error("We just came from a parent so we must have had a parent. This is a bug in React.");Z.lanes|=g,G=Z.alternate,G!==null&&(G.lanes|=g),s8(Z,g,w),Z=null}else Z=z.child;if(Z!==null)Z.return=z;else for(Z=z;Z!==null;){if(Z===w){Z=null;break}if(z=Z.sibling,z!==null){z.return=Z.return,Z=z;break}Z=Z.return}z=Z}}function Bg(w,v,g,x){w=null;for(var z=v,G=!1;z!==null;){if(!G){if((z.flags&524288)!==0)G=!0;else if((z.flags&262144)!==0)break}if(z.tag===10){var Z=z.alternate;if(Z===null)throw Error("Should have a current fiber. This is a bug in React.");if(Z=Z.memoizedProps,Z!==null){var B=z.type;rw(z.pendingProps.value,Z.value)||(w!==null?w.push(B):w=[B])}}else if(z===B6.current){if(Z=z.alternate,Z===null)throw Error("Should have a current fiber. This is a bug in React.");Z.memoizedState.memoizedState!==z.memoizedState.memoizedState&&(w!==null?w.push(mx):w=[mx])}z=z.return}w!==null&&i8(v,w,g,x),v.flags|=262144}function q3(w){for(w=w.firstContext;w!==null;){if(!rw(w.context._currentValue,w.memoizedValue))return!0;w=w.next}return!1}function Iv(w){j6=w,Sg=null,w=w.dependencies,w!==null&&(w.firstContext=null)}function ww(w){return dg&&console.error("Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo()."),VZ(j6,w)}function U3(w,v){return j6===null&&Iv(w),VZ(w,v)}function VZ(w,v){var g=v._currentValue;if(v={context:v,memoizedValue:g,next:null},Sg===null){if(w===null)throw Error("Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo().");Sg=v,w.dependencies={lanes:0,firstContext:v,_debugThenableState:null},w.flags|=524288}else Sg=Sg.next=v;return g}function r8(){return{controller:new MW,data:new Map,refCount:0}}function bv(w){w.controller.signal.aborted&&console.warn("A cache instance was retained after it was already freed. This likely indicates a bug in React."),w.refCount++}function j4(w){w.refCount--,0>w.refCount&&console.warn("A cache instance was released after it was already freed. This likely indicates a bug in React."),w.refCount===0&&YW(LW,function(){w.controller.abort()})}function W1(w,v,g){if((w&127)!==0)0>S1&&(S1=Mw(),Hx=A6(v),Qz=v,g!=null&&($z=l(g)),(P0&(Vw|F2))!==Pw&&(Xw=!0,m5=Xx),w=y4(),v=l4(),w!==Tg||v!==Jx?Tg=-1.1:v!==null&&(m5=Xx),Cv=w,Jx=v);else if((w&4194048)!==0&&0>l2&&(l2=Mw(),Qx=A6(v),RJ=v,g!=null&&(VJ=l(g)),0>x5)){if(w=y4(),v=l4(),w!==l5||v!==_v)l5=-1.1;u5=w,_v=v}}function dq(w){if(0>S1){S1=Mw(),Hx=w._debugTask!=null?w._debugTask:null,(P0&(Vw|F2))!==Pw&&(m5=Xx);var v=y4(),g=l4();v!==Tg||g!==Jx?Tg=-1.1:g!==null&&(m5=Xx),Cv=v,Jx=g}if(0>l2&&(l2=Mw(),Qx=w._debugTask!=null?w._debugTask:null,0>x5)){if(w=y4(),v=l4(),w!==l5||v!==_v)l5=-1.1;u5=w,_v=v}}function s1(){var w=Pv;return Pv=0,w}function K3(w){var v=Pv;return Pv=w,v}function A4(w){var v=Pv;return Pv+=w,v}function W3(){Z0=G0=-1.1}function Y2(){var w=G0;return G0=-1.1,w}function L2(w){0<=w&&(G0=w)}function M1(){var w=zw;return zw=-0,w}function Y1(w){0<=w&&(zw=w)}function L1(){var w=vw;return vw=null,w}function I1(){var w=Xw;return Xw=!1,w}function n8(w){nw=Mw(),0>w.actualStartTime&&(w.actualStartTime=nw)}function o8(w){if(0<=nw){var v=Mw()-nw;w.actualDuration+=v,w.selfBaseDuration=v,nw=-1}}function DZ(w){if(0<=nw){var v=Mw()-nw;w.actualDuration+=v,nw=-1}}function b1(){if(0<=nw){var w=Mw(),v=w-nw;nw=-1,Pv+=v,zw+=v,Z0=w}}function kZ(w){vw===null&&(vw=[]),vw.push(w),g5===null&&(g5=[]),g5.push(w)}function j1(){nw=Mw(),0>G0&&(G0=nw)}function O4(w){for(var v=w.child;v;)w.actualDuration+=v.actualDuration,v=v.sibling}function Tq(w,v){if(qx===null){var g=qx=[];Uz=0,fv=G9(),mg={status:"pending",value:void 0,then:function(x){g.push(x)}}}return Uz++,v.then(FZ,FZ),v}function FZ(){if(--Uz===0&&(-1<l2||(x5=-1.1),qx!==null)){mg!==null&&(mg.status="fulfilled");var w=qx;qx=null,fv=0,mg=null;for(var v=0;v<w.length;v++)(0,w[v])()}}function mq(w,v){var g=[],x={status:"pending",value:null,reason:null,then:function(z){g.push(z)}};return w.then(function(){x.status="fulfilled",x.value=v;for(var z=0;z<g.length;z++)(0,g[z])(v)},function(z){x.status="rejected",x.reason=z;for(z=0;z<g.length;z++)(0,g[z])(void 0)}),x}function t8(){var w=Ev.current;return w!==null?w:a0.pooledCache}function M3(w,v){v===null?h(Ev,Ev.current,w):h(Ev,v.pool,w)}function hZ(){var w=t8();return w===null?null:{parent:Ww._currentValue,pool:w}}function PZ(){return{didWarnAboutUncachedPromise:!1,thenables:[]}}function CZ(w){return w=w.status,w==="fulfilled"||w==="rejected"}function _Z(w,v,g){k.actQueue!==null&&(k.didUsePromise=!0);var x=w.thenables;if(g=x[g],g===void 0?x.push(v):g!==v&&(w.didWarnAboutUncachedPromise||(w.didWarnAboutUncachedPromise=!0,console.error("A component was suspended by an uncached promise. Creating promises inside a Client Component or hook is not yet supported, except via a Suspense-compatible library or framework.")),v.then(l1,l1),v=g),v._debugInfo===void 0){w=performance.now(),x=v.displayName;var z={name:typeof x==="string"?x:"Promise",start:w,end:w,value:v};v._debugInfo=[{awaited:z}],v.status!=="fulfilled"&&v.status!=="rejected"&&(w=function(){z.end=performance.now()},v.then(w,w))}switch(v.status){case"fulfilled":return v.value;case"rejected":throw w=v.reason,EZ(w),w;default:if(typeof v.status==="string")v.then(l1,l1);else{if(w=a0,w!==null&&100<w.shellSuspendCounter)throw Error("An unknown Component is an async Client Component. Only Server Components can be async at the moment. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server.");w=v,w.status="pending",w.then(function(G){if(v.status==="pending"){var Z=v;Z.status="fulfilled",Z.value=G}},function(G){if(v.status==="pending"){var Z=v;Z.status="rejected",Z.reason=G}})}switch(v.status){case"fulfilled":return v.value;case"rejected":throw w=v.reason,EZ(w),w}throw Sv=v,Ix=!0,ug}}function I5(w){try{return AW(w)}catch(v){if(v!==null&&typeof v==="object"&&typeof v.then==="function")throw Sv=v,Ix=!0,ug;throw v}}function fZ(){if(Sv===null)throw Error("Expected a suspended thenable. This is a bug in React. Please file an issue.");var w=Sv;return Sv=null,Ix=!1,w}function EZ(w){if(w===ug||w===P6)throw Error("Hooks are not supported inside an async component. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server.")}function _w(w){var v=L0;return w!=null&&(L0=v===null?w:v.concat(w)),v}function p8(){var w=L0;if(w!=null){for(var v=w.length-1;0<=v;v--)if(w[v].name!=null){var g=w[v].debugTask;if(g!=null)return g}}return null}function Y3(w,v,g){for(var x=Object.keys(w.props),z=0;z<x.length;z++){var G=x[z];if(G!=="children"&&G!=="key"){v===null&&(v=J3(w,g.mode,0),v._debugInfo=L0,v.return=g),n(v,function(Z){console.error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.",Z)},G);break}}}function L3(w){var v=bx;return bx+=1,lg===null&&(lg=PZ()),_Z(lg,w,v)}function R4(w,v){v=v.props.ref,w.ref=v!==void 0?v:null}function NZ(w,v){if(v.$$typeof===gK)throw Error(`A React Element from an older version of React was rendered. This is not supported. It can happen if:
- Multiple copies of the "react" package is used.
- A library pre-bundled an old copy of "react" or "react/jsx-runtime".
- A compiler tries to "inline" JSX instead of using the runtime.`);throw w=Object.prototype.toString.call(v),Error("Objects are not valid as a React child (found: "+(w==="[object Object]"?"object with keys {"+Object.keys(v).join(", ")+"}":w)+"). If you meant to render a collection of children, use an array instead.")}function I3(w,v){var g=p8();g!==null?g.run(NZ.bind(null,w,v)):NZ(w,v)}function SZ(w,v){var g=l(w)||"Component";sJ[g]||(sJ[g]=!0,v=v.displayName||v.name||"Component",w.tag===3?console.error(`Functions are not valid as a React child. This may happen if you return %s instead of <%s /> from render. Or maybe you meant to call this function rather than return it.
  root.render(%s)`,v,v,v):console.error(`Functions are not valid as a React child. This may happen if you return %s instead of <%s /> from render. Or maybe you meant to call this function rather than return it.
  <%s>{%s}</%s>`,v,v,g,v,g))}function b3(w,v){var g=p8();g!==null?g.run(SZ.bind(null,w,v)):SZ(w,v)}function dZ(w,v){var g=l(w)||"Component";iJ[g]||(iJ[g]=!0,v=String(v),w.tag===3?console.error(`Symbols are not valid as a React child.
  root.render(%s)`,v):console.error(`Symbols are not valid as a React child.
  <%s>%s</%s>`,g,v,g))}function j3(w,v){var g=p8();g!==null?g.run(dZ.bind(null,w,v)):dZ(w,v)}function TZ(w){function v(q,K){if(w){var W=q.deletions;W===null?(q.deletions=[K],q.flags|=16):W.push(K)}}function g(q,K){if(!w)return null;for(;K!==null;)v(q,K),K=K.sibling;return null}function x(q){for(var K=new Map;q!==null;)q.key!==null?K.set(q.key,q):K.set(q.index,q),q=q.sibling;return K}function z(q,K){return q=y1(q,K),q.index=0,q.sibling=null,q}function G(q,K,W){if(q.index=W,!w)return q.flags|=1048576,K;if(W=q.alternate,W!==null)return W=W.index,W<K?(q.flags|=67108866,K):W;return q.flags|=67108866,K}function Z(q){return w&&q.alternate===null&&(q.flags|=67108866),q}function B(q,K,W,F){if(K===null||K.tag!==6)return K=m8(W,q.mode,F),K.return=q,K._debugOwner=q,K._debugTask=q._debugTask,K._debugInfo=L0,K;return K=z(K,W),K.return=q,K._debugInfo=L0,K}function X(q,K,W,F){var s=W.type;if(s===jg)return K=Y(q,K,W.props.children,F,W.key),Y3(W,K,q),K;if(K!==null&&(K.elementType===s||KZ(K,W)||typeof s==="object"&&s!==null&&s.$$typeof===A2&&I5(s)===K.type))return K=z(K,W.props),R4(K,W),K.return=q,K._debugOwner=W._owner,K._debugInfo=L0,K;return K=J3(W,q.mode,F),R4(K,W),K.return=q,K._debugInfo=L0,K}function H(q,K,W,F){if(K===null||K.tag!==4||K.stateNode.containerInfo!==W.containerInfo||K.stateNode.implementation!==W.implementation)return K=u8(W,q.mode,F),K.return=q,K._debugInfo=L0,K;return K=z(K,W.children||[]),K.return=q,K._debugInfo=L0,K}function Y(q,K,W,F,s){if(K===null||K.tag!==7)return K=Mv(W,q.mode,F,s),K.return=q,K._debugOwner=q,K._debugTask=q._debugTask,K._debugInfo=L0,K;return K=z(K,W),K.return=q,K._debugInfo=L0,K}function L(q,K,W){if(typeof K==="string"&&K!==""||typeof K==="number"||typeof K==="bigint")return K=m8(""+K,q.mode,W),K.return=q,K._debugOwner=q,K._debugTask=q._debugTask,K._debugInfo=L0,K;if(typeof K==="object"&&K!==null){switch(K.$$typeof){case F1:return W=J3(K,q.mode,W),R4(W,K),W.return=q,q=_w(K._debugInfo),W._debugInfo=L0,L0=q,W;case bg:return K=u8(K,q.mode,W),K.return=q,K._debugInfo=L0,K;case A2:var F=_w(K._debugInfo);return K=I5(K),q=L(q,K,W),L0=F,q}if(Ow(K)||o0(K))return W=Mv(K,q.mode,W,null),W.return=q,W._debugOwner=q,W._debugTask=q._debugTask,q=_w(K._debugInfo),W._debugInfo=L0,L0=q,W;if(typeof K.then==="function")return F=_w(K._debugInfo),q=L(q,L3(K),W),L0=F,q;if(K.$$typeof===h1)return L(q,U3(q,K),W);I3(q,K)}return typeof K==="function"&&b3(q,K),typeof K==="symbol"&&j3(q,K),null}function U(q,K,W,F){var s=K!==null?K.key:null;if(typeof W==="string"&&W!==""||typeof W==="number"||typeof W==="bigint")return s!==null?null:B(q,K,""+W,F);if(typeof W==="object"&&W!==null){switch(W.$$typeof){case F1:return W.key===s?(s=_w(W._debugInfo),q=X(q,K,W,F),L0=s,q):null;case bg:return W.key===s?H(q,K,W,F):null;case A2:return s=_w(W._debugInfo),W=I5(W),q=U(q,K,W,F),L0=s,q}if(Ow(W)||o0(W)){if(s!==null)return null;return s=_w(W._debugInfo),q=Y(q,K,W,F,null),L0=s,q}if(typeof W.then==="function")return s=_w(W._debugInfo),q=U(q,K,L3(W),F),L0=s,q;if(W.$$typeof===h1)return U(q,K,U3(q,W),F);I3(q,W)}return typeof W==="function"&&b3(q,W),typeof W==="symbol"&&j3(q,W),null}function R(q,K,W,F,s){if(typeof F==="string"&&F!==""||typeof F==="number"||typeof F==="bigint")return q=q.get(W)||null,B(K,q,""+F,s);if(typeof F==="object"&&F!==null){switch(F.$$typeof){case F1:return W=q.get(F.key===null?W:F.key)||null,q=_w(F._debugInfo),K=X(K,W,F,s),L0=q,K;case bg:return q=q.get(F.key===null?W:F.key)||null,H(K,q,F,s);case A2:var J0=_w(F._debugInfo);return F=I5(F),K=R(q,K,W,F,s),L0=J0,K}if(Ow(F)||o0(F))return W=q.get(W)||null,q=_w(F._debugInfo),K=Y(K,W,F,s,null),L0=q,K;if(typeof F.then==="function")return J0=_w(F._debugInfo),K=R(q,K,W,L3(F),s),L0=J0,K;if(F.$$typeof===h1)return R(q,K,W,U3(K,F),s);I3(K,F)}return typeof F==="function"&&b3(K,F),typeof F==="symbol"&&j3(K,F),null}function u(q,K,W,F){if(typeof W!=="object"||W===null)return F;switch(W.$$typeof){case F1:case bg:P(q,K,W);var s=W.key;if(typeof s!=="string")break;if(F===null){F=new Set,F.add(s);break}if(!F.has(s)){F.add(s);break}n(K,function(){console.error("Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.",s)});break;case A2:W=I5(W),u(q,K,W,F)}return F}function i(q,K,W,F){for(var s=null,J0=null,x0=null,w0=K,W0=K=0,e0=null;w0!==null&&W0<W.length;W0++){w0.index>W0?(e0=w0,w0=null):e0=w0.sibling;var Kw=U(q,w0,W[W0],F);if(Kw===null){w0===null&&(w0=e0);break}s=u(q,Kw,W[W0],s),w&&w0&&Kw.alternate===null&&v(q,w0),K=G(Kw,K,W0),x0===null?J0=Kw:x0.sibling=Kw,x0=Kw,w0=e0}if(W0===W.length)return g(q,w0),D0&&a1(q,W0),J0;if(w0===null){for(;W0<W.length;W0++)w0=L(q,W[W0],F),w0!==null&&(s=u(q,w0,W[W0],s),K=G(w0,K,W0),x0===null?J0=w0:x0.sibling=w0,x0=w0);return D0&&a1(q,W0),J0}for(w0=x(w0);W0<W.length;W0++)e0=R(w0,q,W0,W[W0],F),e0!==null&&(s=u(q,e0,W[W0],s),w&&e0.alternate!==null&&w0.delete(e0.key===null?W0:e0.key),K=G(e0,K,W0),x0===null?J0=e0:x0.sibling=e0,x0=e0);return w&&w0.forEach(function($5){return v(q,$5)}),D0&&a1(q,W0),J0}function n0(q,K,W,F){if(W==null)throw Error("An iterable object provided no iterator.");for(var s=null,J0=null,x0=K,w0=K=0,W0=null,e0=null,Kw=W.next();x0!==null&&!Kw.done;w0++,Kw=W.next()){x0.index>w0?(W0=x0,x0=null):W0=x0.sibling;var $5=U(q,x0,Kw.value,F);if($5===null){x0===null&&(x0=W0);break}e0=u(q,$5,Kw.value,e0),w&&x0&&$5.alternate===null&&v(q,x0),K=G($5,K,w0),J0===null?s=$5:J0.sibling=$5,J0=$5,x0=W0}if(Kw.done)return g(q,x0),D0&&a1(q,w0),s;if(x0===null){for(;!Kw.done;w0++,Kw=W.next())x0=L(q,Kw.value,F),x0!==null&&(e0=u(q,x0,Kw.value,e0),K=G(x0,K,w0),J0===null?s=x0:J0.sibling=x0,J0=x0);return D0&&a1(q,w0),s}for(x0=x(x0);!Kw.done;w0++,Kw=W.next())W0=R(x0,q,w0,Kw.value,F),W0!==null&&(e0=u(q,W0,Kw.value,e0),w&&W0.alternate!==null&&x0.delete(W0.key===null?w0:W0.key),K=G(W0,K,w0),J0===null?s=W0:J0.sibling=W0,J0=W0);return w&&x0.forEach(function(iW){return v(q,iW)}),D0&&a1(q,w0),s}function h0(q,K,W,F){if(typeof W==="object"&&W!==null&&W.type===jg&&W.key===null&&(Y3(W,null,q),W=W.props.children),typeof W==="object"&&W!==null){switch(W.$$typeof){case F1:var s=_w(W._debugInfo);w:{for(var J0=W.key;K!==null;){if(K.key===J0){if(J0=W.type,J0===jg){if(K.tag===7){g(q,K.sibling),F=z(K,W.props.children),F.return=q,F._debugOwner=W._owner,F._debugInfo=L0,Y3(W,F,q),q=F;break w}}else if(K.elementType===J0||KZ(K,W)||typeof J0==="object"&&J0!==null&&J0.$$typeof===A2&&I5(J0)===K.type){g(q,K.sibling),F=z(K,W.props),R4(F,W),F.return=q,F._debugOwner=W._owner,F._debugInfo=L0,q=F;break w}g(q,K);break}else v(q,K);K=K.sibling}W.type===jg?(F=Mv(W.props.children,q.mode,F,W.key),F.return=q,F._debugOwner=q,F._debugTask=q._debugTask,F._debugInfo=L0,Y3(W,F,q),q=F):(F=J3(W,q.mode,F),R4(F,W),F.return=q,F._debugInfo=L0,q=F)}return q=Z(q),L0=s,q;case bg:w:{s=W;for(W=s.key;K!==null;){if(K.key===W)if(K.tag===4&&K.stateNode.containerInfo===s.containerInfo&&K.stateNode.implementation===s.implementation){g(q,K.sibling),F=z(K,s.children||[]),F.return=q,q=F;break w}else{g(q,K);break}else v(q,K);K=K.sibling}F=u8(s,q.mode,F),F.return=q,q=F}return Z(q);case A2:return s=_w(W._debugInfo),W=I5(W),q=h0(q,K,W,F),L0=s,q}if(Ow(W))return s=_w(W._debugInfo),q=i(q,K,W,F),L0=s,q;if(o0(W)){if(s=_w(W._debugInfo),J0=o0(W),typeof J0!=="function")throw Error("An object is not an iterable. This error is likely caused by a bug in React. Please file an issue.");var x0=J0.call(W);if(x0===W){if(q.tag!==0||Object.prototype.toString.call(q.type)!=="[object GeneratorFunction]"||Object.prototype.toString.call(x0)!=="[object Generator]")aJ||console.error("Using Iterators as children is unsupported and will likely yield unexpected results because enumerating a generator mutates it. You may convert it to an array with `Array.from()` or the `[...spread]` operator before rendering. You can also use an Iterable that can iterate multiple times over the same items."),aJ=!0}else W.entries!==J0||Yz||(console.error("Using Maps as children is not supported. Use an array of keyed ReactElements instead."),Yz=!0);return q=n0(q,K,x0,F),L0=s,q}if(typeof W.then==="function")return s=_w(W._debugInfo),q=h0(q,K,L3(W),F),L0=s,q;if(W.$$typeof===h1)return h0(q,K,U3(q,W),F);I3(q,W)}if(typeof W==="string"&&W!==""||typeof W==="number"||typeof W==="bigint")return s=""+W,K!==null&&K.tag===6?(g(q,K.sibling),F=z(K,s),F.return=q,q=F):(g(q,K),F=m8(s,q.mode,F),F.return=q,F._debugOwner=q,F._debugTask=q._debugTask,F._debugInfo=L0,q=F),Z(q);return typeof W==="function"&&b3(q,W),typeof W==="symbol"&&j3(q,W),g(q,K)}return function(q,K,W,F){var s=L0;L0=null;try{bx=0;var J0=h0(q,K,W,F);return lg=null,J0}catch(e0){if(e0===ug||e0===P6)throw e0;var x0=E(29,e0,null,q.mode);x0.lanes=F,x0.return=q;var w0=x0._debugInfo=L0;if(x0._debugOwner=q._debugOwner,x0._debugTask=q._debugTask,w0!=null){for(var W0=w0.length-1;0<=W0;W0--)if(typeof w0[W0].stack==="string"){x0._debugOwner=w0[W0],x0._debugTask=w0[W0].debugTask;break}}return x0}finally{L0=s}}}function mZ(w,v){var g=Ow(w);return w=!g&&typeof o0(w)==="function",g||w?(g=g?"array":"iterable",console.error("A nested %s was passed to row #%s in <SuspenseList />. Wrap it in an additional SuspenseList to configure its revealOrder: <SuspenseList revealOrder=...> ... <SuspenseList revealOrder=...>{%s}</SuspenseList> ... </SuspenseList>",g,v,g),!1):!0}function e8(w){w.updateQueue={baseState:w.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,lanes:0,hiddenCallbacks:null},callbacks:null}}function w7(w,v){w=w.updateQueue,v.updateQueue===w&&(v.updateQueue={baseState:w.baseState,firstBaseUpdate:w.firstBaseUpdate,lastBaseUpdate:w.lastBaseUpdate,shared:w.shared,callbacks:null})}function b5(w){return{lane:w,tag:nJ,payload:null,callback:null,next:null}}function j5(w,v,g){var x=w.updateQueue;if(x===null)return null;if(x=x.shared,Iz===x&&!pJ){var z=l(w);console.error(`An update (setState, replaceState, or forceUpdate) was scheduled from inside an update function. Update functions should be pure, with zero side-effects. Consider using componentDidUpdate or a callback.

Please update the following component: %s`,z),pJ=!0}if((P0&Vw)!==Pw)return z=x.pending,z===null?v.next=v:(v.next=z.next,z.next=v),x.pending=v,v=H3(w),UZ(w,null,g),v;return X3(w,x,v,g),H3(w)}function V4(w,v,g){if(v=v.updateQueue,v!==null&&(v=v.shared,(g&4194048)!==0)){var x=v.lanes;x&=w.pendingLanes,g|=x,v.lanes=g,Jv(w,g)}}function A3(w,v){var{updateQueue:g,alternate:x}=w;if(x!==null&&(x=x.updateQueue,g===x)){var z=null,G=null;if(g=g.firstBaseUpdate,g!==null){do{var Z={lane:g.lane,tag:g.tag,payload:g.payload,callback:null,next:null};G===null?z=G=Z:G=G.next=Z,g=g.next}while(g!==null);G===null?z=G=v:G=G.next=v}else z=G=v;g={baseState:x.baseState,firstBaseUpdate:z,lastBaseUpdate:G,shared:x.shared,callbacks:x.callbacks},w.updateQueue=g;return}w=g.lastBaseUpdate,w===null?g.firstBaseUpdate=v:w.next=v,g.lastBaseUpdate=v}function D4(){if(bz){var w=mg;if(w!==null)throw w}}function k4(w,v,g,x){bz=!1;var z=w.updateQueue;y5=!1,Iz=z.shared;var{firstBaseUpdate:G,lastBaseUpdate:Z}=z,B=z.shared.pending;if(B!==null){z.shared.pending=null;var X=B,H=X.next;X.next=null,Z===null?G=H:Z.next=H,Z=X;var Y=w.alternate;Y!==null&&(Y=Y.updateQueue,B=Y.lastBaseUpdate,B!==Z&&(B===null?Y.firstBaseUpdate=H:B.next=H,Y.lastBaseUpdate=X))}if(G!==null){var L=z.baseState;Z=0,Y=H=X=null,B=G;do{var U=B.lane&-536870913,R=U!==B.lane;if(R?(I0&U)===U:(x&U)===U){U!==0&&U===fv&&(bz=!0),Y!==null&&(Y=Y.next={lane:0,tag:B.tag,payload:B.payload,callback:null,next:null});w:{U=w;var u=B,i=v,n0=g;switch(u.tag){case oJ:if(u=u.payload,typeof u==="function"){dg=!0;var h0=u.call(n0,L,i);if(U.mode&uw){i0(!0);try{u.call(n0,L,i)}finally{i0(!1)}}dg=!1,L=h0;break w}L=u;break w;case Lz:U.flags=U.flags&-65537|128;case nJ:if(h0=u.payload,typeof h0==="function"){if(dg=!0,u=h0.call(n0,L,i),U.mode&uw){i0(!0);try{h0.call(n0,L,i)}finally{i0(!1)}}dg=!1}else u=h0;if(u===null||u===void 0)break w;L=O0({},L,u);break w;case tJ:y5=!0}}U=B.callback,U!==null&&(w.flags|=64,R&&(w.flags|=8192),R=z.callbacks,R===null?z.callbacks=[U]:R.push(U))}else R={lane:U,tag:B.tag,payload:B.payload,callback:B.callback,next:null},Y===null?(H=Y=R,X=L):Y=Y.next=R,Z|=U;if(B=B.next,B===null)if(B=z.shared.pending,B===null)break;else R=B,B=R.next,R.next=null,z.lastBaseUpdate=R,z.shared.pending=null}while(1);Y===null&&(X=L),z.baseState=X,z.firstBaseUpdate=H,z.lastBaseUpdate=Y,G===null&&(z.shared.lanes=0),s5|=Z,w.lanes=Z,w.memoizedState=L}Iz=null}function uZ(w,v){if(typeof w!=="function")throw Error("Invalid argument passed as callback. Expected a function. Instead received: "+w);w.call(v)}function uq(w,v){var g=w.shared.hiddenCallbacks;if(g!==null)for(w.shared.hiddenCallbacks=null,w=0;w<g.length;w++)uZ(g[w],v)}function lZ(w,v){var g=w.callbacks;if(g!==null)for(w.callbacks=null,w=0;w<g.length;w++)uZ(g[w],v)}function yZ(w,v){var g=m1;h(_6,g,w),h(yg,v,w),m1=g|v.baseLanes}function v7(w){h(_6,m1,w),h(yg,yg.current,w)}function g7(w){m1=_6.current,k0(yg,w),k0(_6,w)}function A5(w){var v=w.alternate;h(Uw,Uw.current&ag,w),h(D2,w,w),y2===null&&(v===null||yg.current!==null?y2=w:v.memoizedState!==null&&(y2=w))}function x7(w){h(Uw,Uw.current,w),h(D2,w,w),y2===null&&(y2=w)}function aZ(w){w.tag===22?(h(Uw,Uw.current,w),h(D2,w,w),y2===null&&(y2=w)):O5(w)}function O5(w){h(Uw,Uw.current,w),h(D2,D2.current,w)}function I2(w){k0(D2,w),y2===w&&(y2=null),k0(Uw,w)}function O3(w){for(var v=w;v!==null;){if(v.tag===13){var g=v.memoizedState;if(g!==null&&(g=g.dehydrated,g===null||W9(g)||M9(g)))return v}else if(v.tag===19&&(v.memoizedProps.revealOrder==="forwards"||v.memoizedProps.revealOrder==="backwards"||v.memoizedProps.revealOrder==="unstable_legacy-backwards"||v.memoizedProps.revealOrder==="together")){if((v.flags&128)!==0)return v}else if(v.child!==null){v.child.return=v,v=v.child;continue}if(v===w)break;for(;v.sibling===null;){if(v.return===null||v.return===w)return null;v=v.return}v.sibling.return=v.return,v=v.sibling}return null}function A0(){var w=D;c2===null?c2=[w]:c2.push(w)}function f(){var w=D;if(c2!==null&&(B5++,c2[B5]!==w)){var v=l(H0);if(!eJ.has(v)&&(eJ.add(v),c2!==null)){for(var g="",x=0;x<=B5;x++){var z=c2[x],G=x===B5?w:z;for(z=x+1+". "+z;30>z.length;)z+=" ";z+=G+`
`,g+=z}console.error(`React has detected a change in the order of Hooks called by %s. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks

   Previous render            Next render
   ------------------------------------------------------
%s   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
`,v,g)}}}function Xg(w){w===void 0||w===null||Ow(w)||console.error("%s received a final argument that is not an array (instead, received `%s`). When specified, the final argument must be an array.",D,typeof w)}function R3(){var w=l(H0);vQ.has(w)||(vQ.add(w),console.error("ReactDOM.useFormState has been renamed to React.useActionState. Please update %s to use React.useActionState.",w))}function Jw(){throw Error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`)}function z7(w,v){if(Ox)return!1;if(v===null)return console.error("%s received a final argument during this render, but not during the previous render. Even though the final argument is optional, its type cannot change between renders.",D),!1;w.length!==v.length&&console.error(`The final argument passed to %s changed size between renders. The order and size of this array must remain constant.

Previous: %s
Incoming: %s`,D,"["+v.join(", ")+"]","["+w.join(", ")+"]");for(var g=0;g<v.length&&g<w.length;g++)if(!rw(w[g],v[g]))return!1;return!0}function G7(w,v,g,x,z,G){if(G5=G,H0=v,c2=w!==null?w._debugHookTypes:null,B5=-1,Ox=w!==null&&w.type!==v.type,Object.prototype.toString.call(g)==="[object AsyncFunction]"||Object.prototype.toString.call(g)==="[object AsyncGeneratorFunction]")G=l(H0),jz.has(G)||(jz.add(G),console.error("%s is an async Client Component. Only Server Components can be async at the moment. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server.",G===null?"An unknown Component":"<"+G+">"));v.memoizedState=null,v.updateQueue=null,v.lanes=0,k.H=w!==null&&w.memoizedState!==null?Oz:c2!==null?gQ:Az,Tv=G=(v.mode&uw)!==B0;var Z=Kz(g,x,z);if(Tv=!1,sg&&(Z=Z7(v,g,x,z)),G){i0(!0);try{Z=Z7(v,g,x,z)}finally{i0(!1)}}return cZ(w,v),Z}function cZ(w,v){v._debugHookTypes=c2,v.dependencies===null?Z5!==null&&(v.dependencies={lanes:0,firstContext:null,_debugThenableState:Z5}):v.dependencies._debugThenableState=Z5,k.H=Rx;var g=y0!==null&&y0.next!==null;if(G5=0,c2=D=Yw=y0=H0=null,B5=-1,w!==null&&(w.flags&65011712)!==(v.flags&65011712)&&console.error("Internal React error: Expected static flag was missing. Please notify the React team."),E6=!1,Ax=0,Z5=null,g)throw Error("Rendered fewer hooks than expected. This may be caused by an accidental early return statement.");w===null||Lw||(w=w.dependencies,w!==null&&q3(w)&&(Lw=!0)),Ix?(Ix=!1,w=!0):w=!1,w&&(v=l(v)||"Unknown",wQ.has(v)||jz.has(v)||(wQ.add(v),console.error("`use` was called from inside a try/catch block. This is not allowed and can lead to unexpected behavior. To handle errors triggered by `use`, wrap your component in a error boundary.")))}function Z7(w,v,g,x){H0=w;var z=0;do{if(sg&&(Z5=null),Ax=0,sg=!1,z>=RW)throw Error("Too many re-renders. React limits the number of renders to prevent an infinite loop.");if(z+=1,Ox=!1,Yw=y0=null,w.updateQueue!=null){var G=w.updateQueue;G.lastEffect=null,G.events=null,G.stores=null,G.memoCache!=null&&(G.memoCache.index=0)}B5=-1,k.H=xQ,G=Kz(v,g,x)}while(sg);return G}function lq(){var w=k.H,v=w.useState()[0];return v=typeof v.then==="function"?F4(v):v,w=w.useState()[0],(y0!==null?y0.memoizedState:null)!==w&&(H0.flags|=1024),v}function B7(){var w=N6!==0;return N6=0,w}function X7(w,v,g){v.updateQueue=w.updateQueue,v.flags=(v.mode&x1)!==B0?v.flags&-402655237:v.flags&-2053,w.lanes&=~g}function H7(w){if(E6){for(w=w.memoizedState;w!==null;){var v=w.queue;v!==null&&(v.pending=null),w=w.next}E6=!1}G5=0,c2=Yw=y0=H0=null,B5=-1,D=null,sg=!1,Ax=N6=0,Z5=null}function aw(){var w={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Yw===null?H0.memoizedState=Yw=w:Yw=Yw.next=w,Yw}function T0(){if(y0===null){var w=H0.alternate;w=w!==null?w.memoizedState:null}else w=y0.next;var v=Yw===null?H0.memoizedState:Yw.next;if(v!==null)Yw=v,y0=w;else{if(w===null){if(H0.alternate===null)throw Error("Update hook called on initial render. This is likely a bug in React. Please file an issue.");throw Error("Rendered more hooks than during the previous render.")}y0=w,w={memoizedState:y0.memoizedState,baseState:y0.baseState,baseQueue:y0.baseQueue,queue:y0.queue,next:null},Yw===null?H0.memoizedState=Yw=w:Yw=Yw.next=w}return Yw}function V3(){return{lastEffect:null,events:null,stores:null,memoCache:null}}function F4(w){var v=Ax;return Ax+=1,Z5===null&&(Z5=PZ()),w=_Z(Z5,w,v),v=H0,(Yw===null?v.memoizedState:Yw.next)===null&&(v=v.alternate,k.H=v!==null&&v.memoizedState!==null?Oz:Az),w}function R5(w){if(w!==null&&typeof w==="object"){if(typeof w.then==="function")return F4(w);if(w.$$typeof===h1)return ww(w)}throw Error("An unsupported type was passed to use(): "+String(w))}function jv(w){var v=null,g=H0.updateQueue;if(g!==null&&(v=g.memoCache),v==null){var x=H0.alternate;x!==null&&(x=x.updateQueue,x!==null&&(x=x.memoCache,x!=null&&(v={data:x.data.map(function(z){return z.slice()}),index:0})))}if(v==null&&(v={data:[],index:0}),g===null&&(g=V3(),H0.updateQueue=g),g.memoCache=v,g=v.data[v.index],g===void 0||Ox)for(g=v.data[v.index]=Array(w),x=0;x<w;x++)g[x]=xK;else g.length!==w&&console.error("Expected a constant size argument for each invocation of useMemoCache. The previous cache was allocated with size %s but size %s was requested.",g.length,w);return v.index++,g}function e2(w,v){return typeof v==="function"?v(w):v}function J7(w,v,g){var x=aw();if(g!==void 0){var z=g(v);if(Tv){i0(!0);try{g(v)}finally{i0(!1)}}}else z=v;return x.memoizedState=x.baseState=z,w={pending:null,lanes:0,dispatch:null,lastRenderedReducer:w,lastRenderedState:z},x.queue=w,w=w.dispatch=iq.bind(null,H0,w),[x.memoizedState,w]}function Hg(w){var v=T0();return Q7(v,y0,w)}function Q7(w,v,g){var x=w.queue;if(x===null)throw Error("Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)");x.lastRenderedReducer=g;var z=w.baseQueue,G=x.pending;if(G!==null){if(z!==null){var Z=z.next;z.next=G.next,G.next=Z}v.baseQueue!==z&&console.error("Internal error: Expected work-in-progress queue to be a clone. This is a bug in React."),v.baseQueue=z=G,x.pending=null}if(G=w.baseState,z===null)w.memoizedState=G;else{v=z.next;var B=Z=null,X=null,H=v,Y=!1;do{var L=H.lane&-536870913;if(L!==H.lane?(I0&L)===L:(G5&L)===L){var U=H.revertLane;if(U===0)X!==null&&(X=X.next={lane:0,revertLane:0,gesture:null,action:H.action,hasEagerState:H.hasEagerState,eagerState:H.eagerState,next:null}),L===fv&&(Y=!0);else if((G5&U)===U){H=H.next,U===fv&&(Y=!0);continue}else L={lane:0,revertLane:H.revertLane,gesture:null,action:H.action,hasEagerState:H.hasEagerState,eagerState:H.eagerState,next:null},X===null?(B=X=L,Z=G):X=X.next=L,H0.lanes|=U,s5|=U;L=H.action,Tv&&g(G,L),G=H.hasEagerState?H.eagerState:g(G,L)}else U={lane:L,revertLane:H.revertLane,gesture:H.gesture,action:H.action,hasEagerState:H.hasEagerState,eagerState:H.eagerState,next:null},X===null?(B=X=U,Z=G):X=X.next=U,H0.lanes|=L,s5|=L;H=H.next}while(H!==null&&H!==v);if(X===null?Z=G:X.next=B,!rw(G,w.memoizedState)&&(Lw=!0,Y&&(g=mg,g!==null)))throw g;w.memoizedState=G,w.baseState=Z,w.baseQueue=X,x.lastRenderedState=G}return z===null&&(x.lanes=0),[w.memoizedState,x.dispatch]}function h4(w){var v=T0(),g=v.queue;if(g===null)throw Error("Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)");g.lastRenderedReducer=w;var{dispatch:x,pending:z}=g,G=v.memoizedState;if(z!==null){g.pending=null;var Z=z=z.next;do G=w(G,Z.action),Z=Z.next;while(Z!==z);rw(G,v.memoizedState)||(Lw=!0),v.memoizedState=G,v.baseQueue===null&&(v.baseState=G),g.lastRenderedState=G}return[G,x]}function $7(w,v,g){var x=H0,z=aw();if(D0){if(g===void 0)throw Error("Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.");var G=g();cg||G===g()||(console.error("The result of getServerSnapshot should be cached to avoid an infinite loop"),cg=!0)}else{if(G=v(),cg||(g=v(),rw(G,g)||(console.error("The result of getSnapshot should be cached to avoid an infinite loop"),cg=!0)),a0===null)throw Error("Expected a work-in-progress root. This is a bug in React. Please file an issue.");(I0&127)!==0||sZ(x,v,G)}return z.memoizedState=G,g={value:G,getSnapshot:v},z.queue=g,h3(rZ.bind(null,x,g,w),[w]),x.flags|=2048,Qg(a2|tw,{destroy:void 0},iZ.bind(null,x,g,G,v),null),G}function D3(w,v,g){var x=H0,z=T0(),G=D0;if(G){if(g===void 0)throw Error("Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.");g=g()}else if(g=v(),!cg){var Z=v();rw(g,Z)||(console.error("The result of getSnapshot should be cached to avoid an infinite loop"),cg=!0)}if(Z=!rw((y0||z).memoizedState,g))z.memoizedState=g,Lw=!0;z=z.queue;var B=rZ.bind(null,x,z,w);if(Z2(2048,tw,B,[w]),z.getSnapshot!==v||Z||Yw!==null&&Yw.memoizedState.tag&a2){if(x.flags|=2048,Qg(a2|tw,{destroy:void 0},iZ.bind(null,x,z,g,v),null),a0===null)throw Error("Expected a work-in-progress root. This is a bug in React. Please file an issue.");G||(G5&127)!==0||sZ(x,v,g)}return g}function sZ(w,v,g){w.flags|=16384,w={getSnapshot:v,value:g},v=H0.updateQueue,v===null?(v=V3(),H0.updateQueue=v,v.stores=[w]):(g=v.stores,g===null?v.stores=[w]:g.push(w))}function iZ(w,v,g,x){v.value=g,v.getSnapshot=x,nZ(v)&&oZ(w)}function rZ(w,v,g){return g(function(){nZ(v)&&(W1(2,"updateSyncExternalStore()",w),oZ(w))})}function nZ(w){var v=w.getSnapshot;w=w.value;try{var g=v();return!rw(w,g)}catch(x){return!0}}function oZ(w){var v=Tw(w,2);v!==null&&Bw(v,w,2)}function q7(w){var v=aw();if(typeof w==="function"){var g=w;if(w=g(),Tv){i0(!0);try{g()}finally{i0(!1)}}}return v.memoizedState=v.baseState=w,v.queue={pending:null,lanes:0,dispatch:null,lastRenderedReducer:e2,lastRenderedState:w},v}function U7(w){w=q7(w);var v=w.queue,g=KB.bind(null,H0,v);return v.dispatch=g,[w.memoizedState,g]}function K7(w){var v=aw();v.memoizedState=v.baseState=w;var g={pending:null,lanes:0,dispatch:null,lastRenderedReducer:null,lastRenderedState:null};return v.queue=g,v=F7.bind(null,H0,!0,g),g.dispatch=v,[w,v]}function tZ(w,v){var g=T0();return pZ(g,y0,w,v)}function pZ(w,v,g,x){return w.baseState=g,Q7(w,y0,typeof x==="function"?x:e2)}function eZ(w,v){var g=T0();if(y0!==null)return pZ(g,y0,w,v);return g.baseState=w,[w,g.queue.dispatch]}function yq(w,v,g,x,z){if(N3(w))throw Error("Cannot update form state while rendering.");if(w=v.action,w!==null){var G={payload:z,action:w,next:null,isTransition:!0,status:"pending",value:null,reason:null,listeners:[],then:function(Z){G.listeners.push(Z)}};k.T!==null?g(!0):G.isTransition=!1,x(G),g=v.pending,g===null?(G.next=v.pending=G,wB(v,G)):(G.next=g.next,v.pending=g.next=G)}}function wB(w,v){var{action:g,payload:x}=v,z=w.state;if(v.isTransition){var G=k.T,Z={};Z._updatedFibers=new Set,k.T=Z;try{var B=g(z,x),X=k.S;X!==null&&X(Z,B),vB(w,v,B)}catch(H){W7(w,v,H)}finally{G!==null&&Z.types!==null&&(G.types!==null&&G.types!==Z.types&&console.error("We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."),G.types=Z.types),k.T=G,G===null&&Z._updatedFibers&&(w=Z._updatedFibers.size,Z._updatedFibers.clear(),10<w&&console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."))}}else try{Z=g(z,x),vB(w,v,Z)}catch(H){W7(w,v,H)}}function vB(w,v,g){g!==null&&typeof g==="object"&&typeof g.then==="function"?(k.asyncTransitions++,g.then(E3,E3),g.then(function(x){gB(w,v,x)},function(x){return W7(w,v,x)}),v.isTransition||console.error("An async function with useActionState was called outside of a transition. This is likely not what you intended (for example, isPending will not update correctly). Either call the returned function inside startTransition, or pass it to an `action` or `formAction` prop.")):gB(w,v,g)}function gB(w,v,g){v.status="fulfilled",v.value=g,xB(v),w.state=g,v=w.pending,v!==null&&(g=v.next,g===v?w.pending=null:(g=g.next,v.next=g,wB(w,g)))}function W7(w,v,g){var x=w.pending;if(w.pending=null,x!==null){x=x.next;do v.status="rejected",v.reason=g,xB(v),v=v.next;while(v!==x)}w.action=null}function xB(w){w=w.listeners;for(var v=0;v<w.length;v++)(0,w[v])()}function zB(w,v){return v}function Jg(w,v){if(D0){var g=a0.formState;if(g!==null){w:{var x=H0;if(D0){if(p0){v:{var z=p0;for(var G=u2;z.nodeType!==8;){if(!G){z=null;break v}if(z=j2(z.nextSibling),z===null){z=null;break v}}G=z.data,z=G===iz||G===lQ?z:null}if(z){p0=j2(z.nextSibling),x=z.data===iz;break w}}Y5(x)}x=!1}x&&(v=g[0])}}return g=aw(),g.memoizedState=g.baseState=v,x={pending:null,lanes:0,dispatch:null,lastRenderedReducer:zB,lastRenderedState:v},g.queue=x,g=KB.bind(null,H0,x),x.dispatch=g,x=q7(!1),G=F7.bind(null,H0,!1,x.queue),x=aw(),z={state:v,dispatch:null,action:w,pending:null},x.queue=z,g=yq.bind(null,H0,z,G,g),z.dispatch=g,x.memoizedState=w,[v,g,!1]}function k3(w){var v=T0();return GB(v,y0,w)}function GB(w,v,g){if(v=Q7(w,v,zB)[0],w=Hg(e2)[0],typeof v==="object"&&v!==null&&typeof v.then==="function")try{var x=F4(v)}catch(Z){if(Z===ug)throw P6;throw Z}else x=v;v=T0();var z=v.queue,G=z.dispatch;return g!==v.memoizedState&&(H0.flags|=2048,Qg(a2|tw,{destroy:void 0},aq.bind(null,z,g),null)),[x,G,w]}function aq(w,v){w.action=v}function F3(w){var v=T0(),g=y0;if(g!==null)return GB(v,g,w);T0(),v=v.memoizedState,g=T0();var x=g.queue.dispatch;return g.memoizedState=w,[v,x,!1]}function Qg(w,v,g,x){return w={tag:w,create:g,deps:x,inst:v,next:null},v=H0.updateQueue,v===null&&(v=V3(),H0.updateQueue=v),g=v.lastEffect,g===null?v.lastEffect=w.next=w:(x=g.next,g.next=w,w.next=x,v.lastEffect=w),w}function M7(w){var v=aw();return w={current:w},v.memoizedState=w}function Av(w,v,g,x){var z=aw();H0.flags|=w,z.memoizedState=Qg(a2|v,{destroy:void 0},g,x===void 0?null:x)}function Z2(w,v,g,x){var z=T0();x=x===void 0?null:x;var G=z.memoizedState.inst;y0!==null&&x!==null&&z7(x,y0.memoizedState.deps)?z.memoizedState=Qg(v,G,g,x):(H0.flags|=w,z.memoizedState=Qg(a2|v,G,g,x))}function h3(w,v){(H0.mode&x1)!==B0?Av(276826112,tw,w,v):Av(8390656,tw,w,v)}function cq(w){H0.flags|=4;var v=H0.updateQueue;if(v===null)v=V3(),H0.updateQueue=v,v.events=[w];else{var g=v.events;g===null?v.events=[w]:g.push(w)}}function Y7(w){var v=aw(),g={impl:w};return v.memoizedState=g,function(){if((P0&Vw)!==Pw)throw Error("A function wrapped in useEffectEvent can't be called during rendering.");return g.impl.apply(void 0,arguments)}}function P3(w){var v=T0().memoizedState;return cq({ref:v,nextImpl:w}),function(){if((P0&Vw)!==Pw)throw Error("A function wrapped in useEffectEvent can't be called during rendering.");return v.impl.apply(void 0,arguments)}}function L7(w,v){var g=4194308;return(H0.mode&x1)!==B0&&(g|=134217728),Av(g,k2,w,v)}function ZB(w,v){if(typeof v==="function"){w=w();var g=v(w);return function(){typeof g==="function"?g():v(null)}}if(v!==null&&v!==void 0)return v.hasOwnProperty("current")||console.error("Expected useImperativeHandle() first argument to either be a ref callback or React.createRef() object. Instead received: %s.","an object with keys {"+Object.keys(v).join(", ")+"}"),w=w(),v.current=w,function(){v.current=null}}function I7(w,v,g){typeof v!=="function"&&console.error("Expected useImperativeHandle() second argument to be a function that creates a handle. Instead received: %s.",v!==null?typeof v:"null"),g=g!==null&&g!==void 0?g.concat([w]):null;var x=4194308;(H0.mode&x1)!==B0&&(x|=134217728),Av(x,k2,ZB.bind(null,v,w),g)}function C3(w,v,g){typeof v!=="function"&&console.error("Expected useImperativeHandle() second argument to be a function that creates a handle. Instead received: %s.",v!==null?typeof v:"null"),g=g!==null&&g!==void 0?g.concat([w]):null,Z2(4,k2,ZB.bind(null,v,w),g)}function b7(w,v){return aw().memoizedState=[w,v===void 0?null:v],w}function _3(w,v){var g=T0();v=v===void 0?null:v;var x=g.memoizedState;if(v!==null&&z7(v,x[1]))return x[0];return g.memoizedState=[w,v],w}function j7(w,v){var g=aw();v=v===void 0?null:v;var x=w();if(Tv){i0(!0);try{w()}finally{i0(!1)}}return g.memoizedState=[x,v],x}function f3(w,v){var g=T0();v=v===void 0?null:v;var x=g.memoizedState;if(v!==null&&z7(v,x[1]))return x[0];if(x=w(),Tv){i0(!0);try{w()}finally{i0(!1)}}return g.memoizedState=[x,v],x}function A7(w,v){var g=aw();return O7(g,w,v)}function BB(w,v){var g=T0();return HB(g,y0.memoizedState,w,v)}function XB(w,v){var g=T0();return y0===null?O7(g,w,v):HB(g,y0.memoizedState,w,v)}function O7(w,v,g){if(g===void 0||(G5&1073741824)!==0&&(I0&261930)===0)return w.memoizedState=v;return w.memoizedState=g,w=JX(),H0.lanes|=w,s5|=w,g}function HB(w,v,g,x){if(rw(g,v))return g;if(yg.current!==null)return w=O7(w,g,x),rw(w,v)||(Lw=!0),w;if((G5&42)===0||(G5&1073741824)!==0&&(I0&261930)===0)return Lw=!0,w.memoizedState=g;return w=JX(),H0.lanes|=w,s5|=w,v}function E3(){k.asyncTransitions--}function JB(w,v,g,x,z){var G=d0.p;d0.p=G!==0&&G<g1?G:g1;var Z=k.T,B={};B._updatedFibers=new Set,k.T=B,F7(w,!1,v,g);try{var X=z(),H=k.S;if(H!==null&&H(B,X),X!==null&&typeof X==="object"&&typeof X.then==="function"){k.asyncTransitions++,X.then(E3,E3);var Y=mq(X,x);P4(w,v,Y,b2(w))}else P4(w,v,x,b2(w))}catch(L){P4(w,v,{then:function(){},status:"rejected",reason:L},b2(w))}finally{d0.p=G,Z!==null&&B.types!==null&&(Z.types!==null&&Z.types!==B.types&&console.error("We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."),Z.types=B.types),k.T=Z,Z===null&&B._updatedFibers&&(w=B._updatedFibers.size,B._updatedFibers.clear(),10<w&&console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."))}}function R7(w,v,g,x){if(w.tag!==5)throw Error("Expected the form instance to be a HostComponent. This is a bug in React.");var z=QB(w).queue;dq(w),JB(w,z,v,ov,g===null?r:function(){return $B(w),g(x)})}function QB(w){var v=w.memoizedState;if(v!==null)return v;v={memoizedState:ov,baseState:ov,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:e2,lastRenderedState:ov},next:null};var g={};return v.next={memoizedState:g,baseState:g,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:e2,lastRenderedState:g},next:null},w.memoizedState=v,w=w.alternate,w!==null&&(w.memoizedState=v),v}function $B(w){k.T===null&&console.error("requestFormReset was called outside a transition or action. To fix, move to an action, or wrap with startTransition.");var v=QB(w);v.next===null&&(v=w.alternate.memoizedState),P4(w,v.next.queue,{},b2(w))}function V7(){var w=q7(!1);return w=JB.bind(null,H0,w.queue,!0,!1),aw().memoizedState=w,[!1,w]}function qB(){var w=Hg(e2)[0],v=T0().memoizedState;return[typeof w==="boolean"?w:F4(w),v]}function UB(){var w=h4(e2)[0],v=T0().memoizedState;return[typeof w==="boolean"?w:F4(w),v]}function Ov(){return ww(mx)}function D7(){var w=aw(),v=a0.identifierPrefix;if(D0){var g=w5,x=e1;g=(x&~(1<<32-cw(x)-1)).toString(32)+g,v="_"+v+"R_"+g,g=N6++,0<g&&(v+="H"+g.toString(32)),v+="_"}else g=OW++,v="_"+v+"r_"+g.toString(32)+"_";return w.memoizedState=v}function k7(){return aw().memoizedState=sq.bind(null,H0)}function sq(w,v){for(var g=w.return;g!==null;){switch(g.tag){case 24:case 3:var x=b2(g),z=b5(x),G=j5(g,z,x);G!==null&&(W1(x,"refresh()",w),Bw(G,g,x),V4(G,g,x)),w=r8(),v!==null&&v!==void 0&&G!==null&&console.error("The seed argument is not enabled outside experimental channels."),z.payload={cache:w};return}g=g.return}}function iq(w,v,g){var x=arguments;typeof x[3]==="function"&&console.error("State updates from the useState() and useReducer() Hooks don't support the second callback argument. To execute a side effect after rendering, declare it in the component body with useEffect()."),x=b2(w);var z={lane:x,revertLane:0,gesture:null,action:g,hasEagerState:!1,eagerState:null,next:null};N3(w)?WB(v,z):(z=N8(w,v,z,x),z!==null&&(W1(x,"dispatch()",w),Bw(z,w,x),MB(z,v,x)))}function KB(w,v,g){var x=arguments;typeof x[3]==="function"&&console.error("State updates from the useState() and useReducer() Hooks don't support the second callback argument. To execute a side effect after rendering, declare it in the component body with useEffect()."),x=b2(w),P4(w,v,g,x)&&W1(x,"setState()",w)}function P4(w,v,g,x){var z={lane:x,revertLane:0,gesture:null,action:g,hasEagerState:!1,eagerState:null,next:null};if(N3(w))WB(v,z);else{var G=w.alternate;if(w.lanes===0&&(G===null||G.lanes===0)&&(G=v.lastRenderedReducer,G!==null)){var Z=k.H;k.H=G1;try{var B=v.lastRenderedState,X=G(B,g);if(z.hasEagerState=!0,z.eagerState=X,rw(X,B))return X3(w,v,z,0),a0===null&&B3(),!1}catch(H){}finally{k.H=Z}}if(g=N8(w,v,z,x),g!==null)return Bw(g,w,x),MB(g,v,x),!0}return!1}function F7(w,v,g,x){if(k.T===null&&fv===0&&console.error("An optimistic state update occurred outside a transition or action. To fix, move the update to an action, or wrap with startTransition."),x={lane:2,revertLane:G9(),gesture:null,action:x,hasEagerState:!1,eagerState:null,next:null},N3(w)){if(v)throw Error("Cannot update optimistic state while rendering.");console.error("Cannot call startTransition while rendering.")}else v=N8(w,g,x,2),v!==null&&(W1(2,"setOptimistic()",w),Bw(v,w,2))}function N3(w){var v=w.alternate;return w===H0||v!==null&&v===H0}function WB(w,v){sg=E6=!0;var g=w.pending;g===null?v.next=v:(v.next=g.next,g.next=v),w.pending=v}function MB(w,v,g){if((g&4194048)!==0){var x=v.lanes;x&=w.pendingLanes,g|=x,v.lanes=g,Jv(w,g)}}function h7(w){if(w!==null&&typeof w!=="function"){var v=String(w);UQ.has(v)||(UQ.add(v),console.error("Expected the last optional `callback` argument to be a function. Instead received: %s.",w))}}function P7(w,v,g,x){var z=w.memoizedState,G=g(x,z);if(w.mode&uw){i0(!0);try{G=g(x,z)}finally{i0(!1)}}G===void 0&&(v=b0(v)||"Component",JQ.has(v)||(JQ.add(v),console.error("%s.getDerivedStateFromProps(): A valid state object (or null) must be returned. You have returned undefined.",v))),z=G===null||G===void 0?z:O0({},z,G),w.memoizedState=z,w.lanes===0&&(w.updateQueue.baseState=z)}function YB(w,v,g,x,z,G,Z){var B=w.stateNode;if(typeof B.shouldComponentUpdate==="function"){if(g=B.shouldComponentUpdate(x,G,Z),w.mode&uw){i0(!0);try{g=B.shouldComponentUpdate(x,G,Z)}finally{i0(!1)}}return g===void 0&&console.error("%s.shouldComponentUpdate(): Returned undefined instead of a boolean value. Make sure to return true or false.",b0(v)||"Component"),g}return v.prototype&&v.prototype.isPureReactComponent?!L4(g,x)||!L4(z,G):!0}function LB(w,v,g,x){var z=v.state;typeof v.componentWillReceiveProps==="function"&&v.componentWillReceiveProps(g,x),typeof v.UNSAFE_componentWillReceiveProps==="function"&&v.UNSAFE_componentWillReceiveProps(g,x),v.state!==z&&(w=l(w)||"Component",GQ.has(w)||(GQ.add(w),console.error("%s.componentWillReceiveProps(): Assigning directly to this.state is deprecated (except inside a component's constructor). Use setState instead.",w)),Rz.enqueueReplaceState(v,v.state,null))}function Rv(w,v){var g=v;if("ref"in v){g={};for(var x in v)x!=="ref"&&(g[x]=v[x])}if(w=w.defaultProps){g===v&&(g=O0({},g));for(var z in w)g[z]===void 0&&(g[z]=w[z])}return g}function IB(w){gz(w),console.warn(`%s

%s
`,ig?"An error occurred in the <"+ig+"> component.":"An error occurred in one of your React components.",`Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://react.dev/link/error-boundaries to learn more about error boundaries.`)}function bB(w){var v=ig?"The above error occurred in the <"+ig+"> component.":"The above error occurred in one of your React components.",g="React will try to recreate this component tree from scratch using the error boundary you provided, "+((Vz||"Anonymous")+".");if(typeof w==="object"&&w!==null&&typeof w.environmentName==="string"){var x=w.environmentName;w=[`%o

%s

%s
`,w,v,g].slice(0),typeof w[0]==="string"?w.splice(0,1,oQ+" "+w[0],tQ,B8+x+B8,pQ):w.splice(0,0,oQ,tQ,B8+x+B8,pQ),w.unshift(console),x=cW.apply(console.error,w),x()}else console.error(`%o

%s

%s
`,w,v,g)}function jB(w){gz(w)}function S3(w,v){try{ig=v.source?l(v.source):null,Vz=null;var g=v.value;if(k.actQueue!==null)k.thrownErrors.push(g);else{var x=w.onUncaughtError;x(g,{componentStack:v.stack})}}catch(z){setTimeout(function(){throw z})}}function AB(w,v,g){try{ig=g.source?l(g.source):null,Vz=l(v);var x=w.onCaughtError;x(g.value,{componentStack:g.stack,errorBoundary:v.tag===1?v.stateNode:null})}catch(z){setTimeout(function(){throw z})}}function C7(w,v,g){return g=b5(g),g.tag=Lz,g.payload={element:null},g.callback=function(){n(v.source,S3,w,v)},g}function _7(w){return w=b5(w),w.tag=Lz,w}function f7(w,v,g,x){var z=g.type.getDerivedStateFromError;if(typeof z==="function"){var G=x.value;w.payload=function(){return z(G)},w.callback=function(){WZ(g),n(x.source,AB,v,g,x)}}var Z=g.stateNode;Z!==null&&typeof Z.componentDidCatch==="function"&&(w.callback=function(){WZ(g),n(x.source,AB,v,g,x),typeof z!=="function"&&(r5===null?r5=new Set([this]):r5.add(this)),IW(this,x),typeof z==="function"||(g.lanes&2)===0&&console.error("%s: Error boundaries should implement getDerivedStateFromError(). In that method, return a state update to display an error message or fallback UI.",l(g)||"Unknown")})}function rq(w,v,g,x,z){if(g.flags|=32768,_1&&T4(w,z),x!==null&&typeof x==="object"&&typeof x.then==="function"){if(v=g.alternate,v!==null&&Bg(v,g,z,!0),D0&&(N1=!0),g=D2.current,g!==null){switch(g.tag){case 31:case 13:return y2===null?s3():g.alternate===null&&Gw===H5&&(Gw=T6),g.flags&=-257,g.flags|=65536,g.lanes=z,x===C6?g.flags|=16384:(v=g.updateQueue,v===null?g.updateQueue=new Set([x]):v.add(x),v9(w,x,z)),!1;case 22:return g.flags|=65536,x===C6?g.flags|=16384:(v=g.updateQueue,v===null?(v={transitions:null,markerInstances:null,retryQueue:new Set([x])},g.updateQueue=v):(g=v.retryQueue,g===null?v.retryQueue=new Set([x]):g.add(x)),v9(w,x,z)),!1}throw Error("Unexpected Suspense handler tag ("+g.tag+"). This is a bug in React.")}return v9(w,x,z),s3(),!1}if(D0)return N1=!0,v=D2.current,v!==null?((v.flags&65536)===0&&(v.flags|=256),v.flags|=65536,v.lanes=z,x!==Xz&&b4(M2(Error("There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.",{cause:x}),g))):(x!==Xz&&b4(M2(Error("There was an error while hydrating but React was able to recover by instead client rendering the entire root.",{cause:x}),g)),w=w.current.alternate,w.flags|=65536,z&=-z,w.lanes|=z,x=M2(x,g),z=C7(w.stateNode,x,z),A3(w,z),Gw!==a5&&(Gw=mv)),!1;var G=M2(Error("There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.",{cause:x}),g);if(Px===null?Px=[G]:Px.push(G),Gw!==a5&&(Gw=mv),v===null)return!0;x=M2(x,g),g=v;do{switch(g.tag){case 3:return g.flags|=65536,w=z&-z,g.lanes|=w,w=C7(g.stateNode,x,w),A3(g,w),!1;case 1:if(v=g.type,G=g.stateNode,(g.flags&128)===0&&(typeof v.getDerivedStateFromError==="function"||G!==null&&typeof G.componentDidCatch==="function"&&(r5===null||!r5.has(G))))return g.flags|=65536,z&=-z,g.lanes|=z,z=_7(z),f7(z,w,g,x),A3(g,z),!1}g=g.return}while(g!==null);return!1}function fw(w,v,g,x){v.child=w===null?rJ(v,null,g,x):dv(v,w.child,g,x)}function OB(w,v,g,x,z){g=g.render;var G=v.ref;if("ref"in x){var Z={};for(var B in x)B!=="ref"&&(Z[B]=x[B])}else Z=x;if(Iv(v),x=G7(w,v,g,Z,G,z),B=B7(),w!==null&&!Lw)return X7(w,v,z),i1(w,v,z);return D0&&B&&l8(v),v.flags|=1,fw(w,v,x,z),v.child}function RB(w,v,g,x,z){if(w===null){var G=g.type;if(typeof G==="function"&&!d8(G)&&G.defaultProps===void 0&&g.compare===null)return g=Wv(G),v.tag=15,v.type=g,N7(v,G),VB(w,v,g,x,z);return w=T8(g.type,null,x,v,v.mode,z),w.ref=v.ref,w.return=v,v.child=w}if(G=w.child,!l7(w,z)){var Z=G.memoizedProps;if(g=g.compare,g=g!==null?g:L4,g(Z,x)&&w.ref===v.ref)return i1(w,v,z)}return v.flags|=1,w=y1(G,x),w.ref=v.ref,w.return=v,v.child=w}function VB(w,v,g,x,z){if(w!==null){var G=w.memoizedProps;if(L4(G,x)&&w.ref===v.ref&&v.type===w.type)if(Lw=!1,v.pendingProps=x=G,l7(w,z))(w.flags&131072)!==0&&(Lw=!0);else return v.lanes=w.lanes,i1(w,v,z)}return E7(w,v,g,x,z)}function DB(w,v,g,x){var z=x.children,G=w!==null?w.memoizedState:null;if(w===null&&v.stateNode===null&&(v.stateNode={_visibility:Zx,_pendingMarkers:null,_retryCache:null,_transitions:null}),x.mode==="hidden"){if((v.flags&128)!==0){if(G=G!==null?G.baseLanes|g:g,w!==null){x=v.child=w.child;for(z=0;x!==null;)z=z|x.lanes|x.childLanes,x=x.sibling;x=z&~G}else x=0,v.child=null;return kB(w,v,G,g,x)}if((g&536870912)!==0)v.memoizedState={baseLanes:0,cachePool:null},w!==null&&M3(v,G!==null?G.cachePool:null),G!==null?yZ(v,G):v7(v),aZ(v);else return x=v.lanes=536870912,kB(w,v,G!==null?G.baseLanes|g:g,g,x)}else G!==null?(M3(v,G.cachePool),yZ(v,G),O5(v),v.memoizedState=null):(w!==null&&M3(v,null),v7(v),O5(v));return fw(w,v,z,g),v.child}function C4(w,v){return w!==null&&w.tag===22||v.stateNode!==null||(v.stateNode={_visibility:Zx,_pendingMarkers:null,_retryCache:null,_transitions:null}),v.sibling}function kB(w,v,g,x,z){var G=t8();return G=G===null?null:{parent:Ww._currentValue,pool:G},v.memoizedState={baseLanes:g,cachePool:G},w!==null&&M3(v,null),v7(v),aZ(v),w!==null&&Bg(w,v,x,!0),v.childLanes=z,null}function d3(w,v){var g=v.hidden;return g!==void 0&&console.error(`<Activity> doesn't accept a hidden prop. Use mode="hidden" instead.
- <Activity %s>
+ <Activity %s>`,g===!0?"hidden":g===!1?"hidden={false}":"hidden={...}",g?'mode="hidden"':'mode="visible"'),v=m3({mode:v.mode,children:v.children},w.mode),v.ref=w.ref,w.child=v,v.return=w,v}function FB(w,v,g){return dv(v,w.child,null,g),w=d3(v,v.pendingProps),w.flags|=2,I2(v),v.memoizedState=null,w}function nq(w,v,g){var x=v.pendingProps,z=(v.flags&128)!==0;if(v.flags&=-129,w===null){if(D0){if(x.mode==="hidden")return w=d3(v,x),v.lanes=536870912,C4(null,w);if(x7(v),(w=p0)?(g=wH(w,u2),g=g!==null&&g.data===sv?g:null,g!==null&&(x={dehydrated:g,treeContext:bZ(),retryLane:536870912,hydrationErrors:null},v.memoizedState=x,x=LZ(g),x.return=v,v.child=x,Sw=v,p0=null)):g=null,g===null)throw Q3(v,w),Y5(v);return v.lanes=536870912,null}return d3(v,x)}var G=w.memoizedState;if(G!==null){var Z=G.dehydrated;if(x7(v),z)if(v.flags&256)v.flags&=-257,v=FB(w,v,g);else if(v.memoizedState!==null)v.child=w.child,v.flags|=128,v=null;else throw Error("Client rendering an Activity suspended it again. This is a bug in React.");else if(AZ(),(g&536870912)!==0&&c3(v),Lw||Bg(w,v,g,!1),z=(g&w.childLanes)!==0,Lw||z){if(x=a0,x!==null&&(Z=Qv(x,g),Z!==0&&Z!==G.retryLane))throw G.retryLane=Z,Tw(w,Z),Bw(x,w,Z),Dz;s3(),v=FB(w,v,g)}else w=G.treeContext,p0=j2(Z.nextSibling),Sw=v,D0=!0,S5=null,N1=!1,V2=null,u2=!1,w!==null&&jZ(v,w),v=d3(v,x),v.flags|=4096;return v}return G=w.child,x={mode:x.mode,children:x.children},(g&536870912)!==0&&(g&w.lanes)!==0&&c3(v),w=y1(G,x),w.ref=v.ref,v.child=w,w.return=v,w}function T3(w,v){var g=v.ref;if(g===null)w!==null&&w.ref!==null&&(v.flags|=4194816);else{if(typeof g!=="function"&&typeof g!=="object")throw Error("Expected ref to be a function, an object returned by React.createRef(), or undefined/null.");if(w===null||w.ref!==g)v.flags|=4194816}}function E7(w,v,g,x,z){if(g.prototype&&typeof g.prototype.render==="function"){var G=b0(g)||"Unknown";KQ[G]||(console.error("The <%s /> component appears to have a render method, but doesn't extend React.Component. This is likely to cause errors. Change %s to extend React.Component instead.",G,G),KQ[G]=!0)}if(v.mode&uw&&z1.recordLegacyContextWarning(v,null),w===null&&(N7(v,v.type),g.contextTypes&&(G=b0(g)||"Unknown",MQ[G]||(MQ[G]=!0,console.error("%s uses the legacy contextTypes API which was removed in React 19. Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)",G)))),Iv(v),g=G7(w,v,g,x,void 0,z),x=B7(),w!==null&&!Lw)return X7(w,v,z),i1(w,v,z);return D0&&x&&l8(v),v.flags|=1,fw(w,v,g,z),v.child}function hB(w,v,g,x,z,G){if(Iv(v),B5=-1,Ox=w!==null&&w.type!==v.type,v.updateQueue=null,g=Z7(v,x,g,z),cZ(w,v),x=B7(),w!==null&&!Lw)return X7(w,v,G),i1(w,v,G);return D0&&x&&l8(v),v.flags|=1,fw(w,v,g,G),v.child}function PB(w,v,g,x,z){switch(_(v)){case!1:var G=v.stateNode,Z=new v.type(v.memoizedProps,G.context).state;G.updater.enqueueSetState(G,Z,null);break;case!0:v.flags|=128,v.flags|=65536,G=Error("Simulated error coming from DevTools");var B=z&-z;if(v.lanes|=B,Z=a0,Z===null)throw Error("Expected a work-in-progress root. This is a bug in React. Please file an issue.");B=_7(B),f7(B,Z,v,M2(G,v)),A3(v,B)}if(Iv(v),v.stateNode===null){if(Z=N5,G=g.contextType,"contextType"in g&&G!==null&&(G===void 0||G.$$typeof!==h1)&&!qQ.has(g)&&(qQ.add(g),B=G===void 0?" However, it is set to undefined. This can be caused by a typo or by mixing up named and default imports. This can also happen due to a circular dependency, so try moving the createContext() call to a separate file.":typeof G!=="object"?" However, it is set to a "+typeof G+".":G.$$typeof===k9?" Did you accidentally pass the Context.Consumer instead?":" However, it is set to an object with keys {"+Object.keys(G).join(", ")+"}.",console.error("%s defines an invalid contextType. contextType should point to the Context object returned by React.createContext().%s",b0(g)||"Component",B)),typeof G==="object"&&G!==null&&(Z=ww(G)),G=new g(x,Z),v.mode&uw){i0(!0);try{G=new g(x,Z)}finally{i0(!1)}}if(Z=v.memoizedState=G.state!==null&&G.state!==void 0?G.state:null,G.updater=Rz,v.stateNode=G,G._reactInternals=v,G._reactInternalInstance=zQ,typeof g.getDerivedStateFromProps==="function"&&Z===null&&(Z=b0(g)||"Component",ZQ.has(Z)||(ZQ.add(Z),console.error("`%s` uses `getDerivedStateFromProps` but its initial state is %s. This is not recommended. Instead, define the initial state by assigning an object to `this.state` in the constructor of `%s`. This ensures that `getDerivedStateFromProps` arguments have a consistent shape.",Z,G.state===null?"null":"undefined",Z))),typeof g.getDerivedStateFromProps==="function"||typeof G.getSnapshotBeforeUpdate==="function"){var X=B=Z=null;if(typeof G.componentWillMount==="function"&&G.componentWillMount.__suppressDeprecationWarning!==!0?Z="componentWillMount":typeof G.UNSAFE_componentWillMount==="function"&&(Z="UNSAFE_componentWillMount"),typeof G.componentWillReceiveProps==="function"&&G.componentWillReceiveProps.__suppressDeprecationWarning!==!0?B="componentWillReceiveProps":typeof G.UNSAFE_componentWillReceiveProps==="function"&&(B="UNSAFE_componentWillReceiveProps"),typeof G.componentWillUpdate==="function"&&G.componentWillUpdate.__suppressDeprecationWarning!==!0?X="componentWillUpdate":typeof G.UNSAFE_componentWillUpdate==="function"&&(X="UNSAFE_componentWillUpdate"),Z!==null||B!==null||X!==null){G=b0(g)||"Component";var H=typeof g.getDerivedStateFromProps==="function"?"getDerivedStateFromProps()":"getSnapshotBeforeUpdate()";XQ.has(G)||(XQ.add(G),console.error(`Unsafe legacy lifecycles will not be called for components using new component APIs.

%s uses %s but also contains the following legacy lifecycles:%s%s%s

The above lifecycles should be removed. Learn more about this warning here:
https://react.dev/link/unsafe-component-lifecycles`,G,H,Z!==null?`
  `+Z:"",B!==null?`
  `+B:"",X!==null?`
  `+X:""))}}G=v.stateNode,Z=b0(g)||"Component",G.render||(g.prototype&&typeof g.prototype.render==="function"?console.error("No `render` method found on the %s instance: did you accidentally return an object from the constructor?",Z):console.error("No `render` method found on the %s instance: you may have forgotten to define `render`.",Z)),!G.getInitialState||G.getInitialState.isReactClassApproved||G.state||console.error("getInitialState was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Did you mean to define a state property instead?",Z),G.getDefaultProps&&!G.getDefaultProps.isReactClassApproved&&console.error("getDefaultProps was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Use a static property to define defaultProps instead.",Z),G.contextType&&console.error("contextType was defined as an instance property on %s. Use a static property to define contextType instead.",Z),g.childContextTypes&&!$Q.has(g)&&($Q.add(g),console.error("%s uses the legacy childContextTypes API which was removed in React 19. Use React.createContext() instead. (https://react.dev/link/legacy-context)",Z)),g.contextTypes&&!QQ.has(g)&&(QQ.add(g),console.error("%s uses the legacy contextTypes API which was removed in React 19. Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)",Z)),typeof G.componentShouldUpdate==="function"&&console.error("%s has a method called componentShouldUpdate(). Did you mean shouldComponentUpdate()? The name is phrased as a question because the function is expected to return a value.",Z),g.prototype&&g.prototype.isPureReactComponent&&typeof G.shouldComponentUpdate<"u"&&console.error("%s has a method called shouldComponentUpdate(). shouldComponentUpdate should not be used when extending React.PureComponent. Please extend React.Component if shouldComponentUpdate is used.",b0(g)||"A pure component"),typeof G.componentDidUnmount==="function"&&console.error("%s has a method called componentDidUnmount(). But there is no such lifecycle method. Did you mean componentWillUnmount()?",Z),typeof G.componentDidReceiveProps==="function"&&console.error("%s has a method called componentDidReceiveProps(). But there is no such lifecycle method. If you meant to update the state in response to changing props, use componentWillReceiveProps(). If you meant to fetch data or run side-effects or mutations after React has updated the UI, use componentDidUpdate().",Z),typeof G.componentWillRecieveProps==="function"&&console.error("%s has a method called componentWillRecieveProps(). Did you mean componentWillReceiveProps()?",Z),typeof G.UNSAFE_componentWillRecieveProps==="function"&&console.error("%s has a method called UNSAFE_componentWillRecieveProps(). Did you mean UNSAFE_componentWillReceiveProps()?",Z),B=G.props!==x,G.props!==void 0&&B&&console.error("When calling super() in `%s`, make sure to pass up the same props that your component's constructor was passed.",Z),G.defaultProps&&console.error("Setting defaultProps as an instance property on %s is not supported and will be ignored. Instead, define defaultProps as a static property on %s.",Z,Z),typeof G.getSnapshotBeforeUpdate!=="function"||typeof G.componentDidUpdate==="function"||BQ.has(g)||(BQ.add(g),console.error("%s: getSnapshotBeforeUpdate() should be used with componentDidUpdate(). This component defines getSnapshotBeforeUpdate() only.",b0(g))),typeof G.getDerivedStateFromProps==="function"&&console.error("%s: getDerivedStateFromProps() is defined as an instance method and will be ignored. Instead, declare it as a static method.",Z),typeof G.getDerivedStateFromError==="function"&&console.error("%s: getDerivedStateFromError() is defined as an instance method and will be ignored. Instead, declare it as a static method.",Z),typeof g.getSnapshotBeforeUpdate==="function"&&console.error("%s: getSnapshotBeforeUpdate() is defined as a static method and will be ignored. Instead, declare it as an instance method.",Z),(B=G.state)&&(typeof B!=="object"||Ow(B))&&console.error("%s.state: must be set to an object or null",Z),typeof G.getChildContext==="function"&&typeof g.childContextTypes!=="object"&&console.error("%s.getChildContext(): childContextTypes must be defined in order to use getChildContext().",Z),G=v.stateNode,G.props=x,G.state=v.memoizedState,G.refs={},e8(v),Z=g.contextType,G.context=typeof Z==="object"&&Z!==null?ww(Z):N5,G.state===x&&(Z=b0(g)||"Component",HQ.has(Z)||(HQ.add(Z),console.error("%s: It is not recommended to assign props directly to state because updates to props won't be reflected in state. In most cases, it is better to use props directly.",Z))),v.mode&uw&&z1.recordLegacyContextWarning(v,G),z1.recordUnsafeLifecycleWarnings(v,G),G.state=v.memoizedState,Z=g.getDerivedStateFromProps,typeof Z==="function"&&(P7(v,g,Z,x),G.state=v.memoizedState),typeof g.getDerivedStateFromProps==="function"||typeof G.getSnapshotBeforeUpdate==="function"||typeof G.UNSAFE_componentWillMount!=="function"&&typeof G.componentWillMount!=="function"||(Z=G.state,typeof G.componentWillMount==="function"&&G.componentWillMount(),typeof G.UNSAFE_componentWillMount==="function"&&G.UNSAFE_componentWillMount(),Z!==G.state&&(console.error("%s.componentWillMount(): Assigning directly to this.state is deprecated (except inside a component's constructor). Use setState instead.",l(v)||"Component"),Rz.enqueueReplaceState(G,G.state,null)),k4(v,x,G,z),D4(),G.state=v.memoizedState),typeof G.componentDidMount==="function"&&(v.flags|=4194308),(v.mode&x1)!==B0&&(v.flags|=134217728),G=!0}else if(w===null){G=v.stateNode;var Y=v.memoizedProps;B=Rv(g,Y),G.props=B;var L=G.context;X=g.contextType,Z=N5,typeof X==="object"&&X!==null&&(Z=ww(X)),H=g.getDerivedStateFromProps,X=typeof H==="function"||typeof G.getSnapshotBeforeUpdate==="function",Y=v.pendingProps!==Y,X||typeof G.UNSAFE_componentWillReceiveProps!=="function"&&typeof G.componentWillReceiveProps!=="function"||(Y||L!==Z)&&LB(v,G,x,Z),y5=!1;var U=v.memoizedState;G.state=U,k4(v,x,G,z),D4(),L=v.memoizedState,Y||U!==L||y5?(typeof H==="function"&&(P7(v,g,H,x),L=v.memoizedState),(B=y5||YB(v,g,B,x,U,L,Z))?(X||typeof G.UNSAFE_componentWillMount!=="function"&&typeof G.componentWillMount!=="function"||(typeof G.componentWillMount==="function"&&G.componentWillMount(),typeof G.UNSAFE_componentWillMount==="function"&&G.UNSAFE_componentWillMount()),typeof G.componentDidMount==="function"&&(v.flags|=4194308),(v.mode&x1)!==B0&&(v.flags|=134217728)):(typeof G.componentDidMount==="function"&&(v.flags|=4194308),(v.mode&x1)!==B0&&(v.flags|=134217728),v.memoizedProps=x,v.memoizedState=L),G.props=x,G.state=L,G.context=Z,G=B):(typeof G.componentDidMount==="function"&&(v.flags|=4194308),(v.mode&x1)!==B0&&(v.flags|=134217728),G=!1)}else{G=v.stateNode,w7(w,v),Z=v.memoizedProps,X=Rv(g,Z),G.props=X,H=v.pendingProps,U=G.context,L=g.contextType,B=N5,typeof L==="object"&&L!==null&&(B=ww(L)),Y=g.getDerivedStateFromProps,(L=typeof Y==="function"||typeof G.getSnapshotBeforeUpdate==="function")||typeof G.UNSAFE_componentWillReceiveProps!=="function"&&typeof G.componentWillReceiveProps!=="function"||(Z!==H||U!==B)&&LB(v,G,x,B),y5=!1,U=v.memoizedState,G.state=U,k4(v,x,G,z),D4();var R=v.memoizedState;Z!==H||U!==R||y5||w!==null&&w.dependencies!==null&&q3(w.dependencies)?(typeof Y==="function"&&(P7(v,g,Y,x),R=v.memoizedState),(X=y5||YB(v,g,X,x,U,R,B)||w!==null&&w.dependencies!==null&&q3(w.dependencies))?(L||typeof G.UNSAFE_componentWillUpdate!=="function"&&typeof G.componentWillUpdate!=="function"||(typeof G.componentWillUpdate==="function"&&G.componentWillUpdate(x,R,B),typeof G.UNSAFE_componentWillUpdate==="function"&&G.UNSAFE_componentWillUpdate(x,R,B)),typeof G.componentDidUpdate==="function"&&(v.flags|=4),typeof G.getSnapshotBeforeUpdate==="function"&&(v.flags|=1024)):(typeof G.componentDidUpdate!=="function"||Z===w.memoizedProps&&U===w.memoizedState||(v.flags|=4),typeof G.getSnapshotBeforeUpdate!=="function"||Z===w.memoizedProps&&U===w.memoizedState||(v.flags|=1024),v.memoizedProps=x,v.memoizedState=R),G.props=x,G.state=R,G.context=B,G=X):(typeof G.componentDidUpdate!=="function"||Z===w.memoizedProps&&U===w.memoizedState||(v.flags|=4),typeof G.getSnapshotBeforeUpdate!=="function"||Z===w.memoizedProps&&U===w.memoizedState||(v.flags|=1024),G=!1)}if(B=G,T3(w,v),Z=(v.flags&128)!==0,B||Z){if(B=v.stateNode,g0(v),Z&&typeof g.getDerivedStateFromError!=="function")g=null,nw=-1;else if(g=fJ(B),v.mode&uw){i0(!0);try{fJ(B)}finally{i0(!1)}}v.flags|=1,w!==null&&Z?(v.child=dv(v,w.child,null,z),v.child=dv(v,null,g,z)):fw(w,v,g,z),v.memoizedState=B.state,w=v.child}else w=i1(w,v,z);return z=v.stateNode,G&&z.props!==x&&(rg||console.error("It looks like %s is reassigning its own `this.props` while rendering. This is not supported and can lead to confusing bugs.",l(v)||"a component"),rg=!0),w}function CB(w,v,g,x){return Lv(),v.flags|=256,fw(w,v,g,x),v.child}function N7(w,v){v&&v.childContextTypes&&console.error(`childContextTypes cannot be defined on a function component.
  %s.childContextTypes = ...`,v.displayName||v.name||"Component"),typeof v.getDerivedStateFromProps==="function"&&(w=b0(v)||"Unknown",YQ[w]||(console.error("%s: Function components do not support getDerivedStateFromProps.",w),YQ[w]=!0)),typeof v.contextType==="object"&&v.contextType!==null&&(v=b0(v)||"Unknown",WQ[v]||(console.error("%s: Function components do not support contextType.",v),WQ[v]=!0))}function S7(w){return{baseLanes:w,cachePool:hZ()}}function d7(w,v,g){return w=w!==null?w.childLanes&~g:0,v&&(w|=Q2),w}function _B(w,v,g){var x,z=v.pendingProps;d(v)&&(v.flags|=128);var G=!1,Z=(v.flags&128)!==0;if((x=Z)||(x=w!==null&&w.memoizedState===null?!1:(Uw.current&jx)!==0),x&&(G=!0,v.flags&=-129),x=(v.flags&32)!==0,v.flags&=-33,w===null){if(D0){if(G?A5(v):O5(v),(w=p0)?(g=wH(w,u2),g=g!==null&&g.data!==sv?g:null,g!==null&&(x={dehydrated:g,treeContext:bZ(),retryLane:536870912,hydrationErrors:null},v.memoizedState=x,x=LZ(g),x.return=v,v.child=x,Sw=v,p0=null)):g=null,g===null)throw Q3(v,w),Y5(v);return M9(g)?v.lanes=32:v.lanes=536870912,null}var B=z.children;if(z=z.fallback,G){O5(v);var X=v.mode;return B=m3({mode:"hidden",children:B},X),z=Mv(z,X,g,null),B.return=v,z.return=v,B.sibling=z,v.child=B,z=v.child,z.memoizedState=S7(g),z.childLanes=d7(w,x,g),v.memoizedState=kz,C4(null,z)}return A5(v),T7(v,B)}var H=w.memoizedState;if(H!==null){var Y=H.dehydrated;if(Y!==null){if(Z)v.flags&256?(A5(v),v.flags&=-257,v=m7(w,v,g)):v.memoizedState!==null?(O5(v),v.child=w.child,v.flags|=128,v=null):(O5(v),B=z.fallback,X=v.mode,z=m3({mode:"visible",children:z.children},X),B=Mv(B,X,g,null),B.flags|=2,z.return=v,B.return=v,z.sibling=B,v.child=z,dv(v,w.child,null,g),z=v.child,z.memoizedState=S7(g),z.childLanes=d7(w,x,g),v.memoizedState=kz,v=C4(null,z));else if(A5(v),AZ(),(g&536870912)!==0&&c3(v),M9(Y)){if(x=Y.nextSibling&&Y.nextSibling.dataset,x){B=x.dgst;var L=x.msg;X=x.stck;var U=x.cstck}G=L,x=B,z=X,Y=U,B=G,X=Y,B=B?Error(B):Error("The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering."),B.stack=z||"",B.digest=x,x=X===void 0?null:X,z={value:B,source:null,stack:x},typeof x==="string"&&Bz.set(B,z),b4(z),v=m7(w,v,g)}else if(Lw||Bg(w,v,g,!1),x=(g&w.childLanes)!==0,Lw||x){if(x=a0,x!==null&&(z=Qv(x,g),z!==0&&z!==H.retryLane))throw H.retryLane=z,Tw(w,z),Bw(x,w,z),Dz;W9(Y)||s3(),v=m7(w,v,g)}else W9(Y)?(v.flags|=192,v.child=w.child,v=null):(w=H.treeContext,p0=j2(Y.nextSibling),Sw=v,D0=!0,S5=null,N1=!1,V2=null,u2=!1,w!==null&&jZ(v,w),v=T7(v,z.children),v.flags|=4096);return v}}if(G)return O5(v),B=z.fallback,X=v.mode,U=w.child,Y=U.sibling,z=y1(U,{mode:"hidden",children:z.children}),z.subtreeFlags=U.subtreeFlags&65011712,Y!==null?B=y1(Y,B):(B=Mv(B,X,g,null),B.flags|=2),B.return=v,z.return=v,z.sibling=B,v.child=z,C4(null,z),z=v.child,B=w.child.memoizedState,B===null?B=S7(g):(X=B.cachePool,X!==null?(U=Ww._currentValue,X=X.parent!==U?{parent:U,pool:U}:X):X=hZ(),B={baseLanes:B.baseLanes|g,cachePool:X}),z.memoizedState=B,z.childLanes=d7(w,x,g),v.memoizedState=kz,C4(w.child,z);return H!==null&&(g&62914560)===g&&(g&w.lanes)!==0&&c3(v),A5(v),g=w.child,w=g.sibling,g=y1(g,{mode:"visible",children:z.children}),g.return=v,g.sibling=null,w!==null&&(x=v.deletions,x===null?(v.deletions=[w],v.flags|=16):x.push(w)),v.child=g,v.memoizedState=null,g}function T7(w,v){return v=m3({mode:"visible",children:v},w.mode),v.return=w,w.child=v}function m3(w,v){return w=E(22,w,null,v),w.lanes=0,w}function m7(w,v,g){return dv(v,w.child,null,g),w=T7(v,v.pendingProps.children),w.flags|=2,v.memoizedState=null,w}function fB(w,v,g){w.lanes|=v;var x=w.alternate;x!==null&&(x.lanes|=v),s8(w.return,v,g)}function u7(w,v,g,x,z,G){var Z=w.memoizedState;Z===null?w.memoizedState={isBackwards:v,rendering:null,renderingStartTime:0,last:x,tail:g,tailMode:z,treeForkCount:G}:(Z.isBackwards=v,Z.rendering=null,Z.renderingStartTime=0,Z.last=x,Z.tail=g,Z.tailMode=z,Z.treeForkCount=G)}function EB(w,v,g){var x=v.pendingProps,z=x.revealOrder,G=x.tail,Z=x.children,B=Uw.current;if((x=(B&jx)!==0)?(B=B&ag|jx,v.flags|=128):B&=ag,h(Uw,B,v),B=z==null?"null":z,z!=="forwards"&&z!=="unstable_legacy-backwards"&&z!=="together"&&z!=="independent"&&!LQ[B])if(LQ[B]=!0,z==null)console.error('The default for the <SuspenseList revealOrder="..."> prop is changing. To be future compatible you must explictly specify either "independent" (the current default), "together", "forwards" or "legacy_unstable-backwards".');else if(z==="backwards")console.error('The rendering order of <SuspenseList revealOrder="backwards"> is changing. To be future compatible you must specify revealOrder="legacy_unstable-backwards" instead.');else if(typeof z==="string")switch(z.toLowerCase()){case"together":case"forwards":case"backwards":case"independent":console.error('"%s" is not a valid value for revealOrder on <SuspenseList />. Use lowercase "%s" instead.',z,z.toLowerCase());break;case"forward":case"backward":console.error('"%s" is not a valid value for revealOrder on <SuspenseList />. React uses the -s suffix in the spelling. Use "%ss" instead.',z,z.toLowerCase());break;default:console.error('"%s" is not a supported revealOrder on <SuspenseList />. Did you mean "independent", "together", "forwards" or "backwards"?',z)}else console.error('%s is not a supported value for revealOrder on <SuspenseList />. Did you mean "independent", "together", "forwards" or "backwards"?',z);if(B=G==null?"null":G,!d6[B])if(G==null){if(z==="forwards"||z==="backwards"||z==="unstable_legacy-backwards")d6[B]=!0,console.error('The default for the <SuspenseList tail="..."> prop is changing. To be future compatible you must explictly specify either "visible" (the current default), "collapsed" or "hidden".')}else G!=="visible"&&G!=="collapsed"&&G!=="hidden"?(d6[B]=!0,console.error('"%s" is not a supported value for tail on <SuspenseList />. Did you mean "visible", "collapsed" or "hidden"?',G)):z!=="forwards"&&z!=="backwards"&&z!=="unstable_legacy-backwards"&&(d6[B]=!0,console.error('<SuspenseList tail="%s" /> is only valid if revealOrder is "forwards" or "backwards". Did you mean to specify revealOrder="forwards"?',G));w:if((z==="forwards"||z==="backwards"||z==="unstable_legacy-backwards")&&Z!==void 0&&Z!==null&&Z!==!1)if(Ow(Z)){for(B=0;B<Z.length;B++)if(!mZ(Z[B],B))break w}else if(B=o0(Z),typeof B==="function"){if(B=B.call(Z))for(var X=B.next(),H=0;!X.done;X=B.next()){if(!mZ(X.value,H))break w;H++}}else console.error('A single row was passed to a <SuspenseList revealOrder="%s" />. This is not useful since it needs multiple rows. Did you mean to pass multiple children or an array?',z);if(fw(w,v,Z,g),D0?(M5(),Z=Bx):Z=0,!x&&w!==null&&(w.flags&128)!==0)w:for(w=v.child;w!==null;){if(w.tag===13)w.memoizedState!==null&&fB(w,g,v);else if(w.tag===19)fB(w,g,v);else if(w.child!==null){w.child.return=w,w=w.child;continue}if(w===v)break w;for(;w.sibling===null;){if(w.return===null||w.return===v)break w;w=w.return}w.sibling.return=w.return,w=w.sibling}switch(z){case"forwards":g=v.child;for(z=null;g!==null;)w=g.alternate,w!==null&&O3(w)===null&&(z=g),g=g.sibling;g=z,g===null?(z=v.child,v.child=null):(z=g.sibling,g.sibling=null),u7(v,!1,z,g,G,Z);break;case"backwards":case"unstable_legacy-backwards":g=null,z=v.child;for(v.child=null;z!==null;){if(w=z.alternate,w!==null&&O3(w)===null){v.child=z;break}w=z.sibling,z.sibling=g,g=z,z=w}u7(v,!0,g,null,G,Z);break;case"together":u7(v,!1,null,null,void 0,Z);break;default:v.memoizedState=null}return v.child}function i1(w,v,g){if(w!==null&&(v.dependencies=w.dependencies),nw=-1,s5|=v.lanes,(g&v.childLanes)===0)if(w!==null){if(Bg(w,v,g,!1),(g&v.childLanes)===0)return null}else return null;if(w!==null&&v.child!==w.child)throw Error("Resuming work not yet implemented.");if(v.child!==null){w=v.child,g=y1(w,w.pendingProps),v.child=g;for(g.return=v;w.sibling!==null;)w=w.sibling,g=g.sibling=y1(w,w.pendingProps),g.return=v;g.sibling=null}return v.child}function l7(w,v){if((w.lanes&v)!==0)return!0;return w=w.dependencies,w!==null&&q3(w)?!0:!1}function oq(w,v,g){switch(v.tag){case 3:C(v,v.stateNode.containerInfo),L5(v,Ww,w.memoizedState.cache),Lv();break;case 27:case 5:t(v);break;case 4:C(v,v.stateNode.containerInfo);break;case 10:L5(v,v.type,v.memoizedProps.value);break;case 12:(g&v.childLanes)!==0&&(v.flags|=4),v.flags|=2048;var x=v.stateNode;x.effectDuration=-0,x.passiveEffectDuration=-0;break;case 31:if(v.memoizedState!==null)return v.flags|=128,x7(v),null;break;case 13:if(x=v.memoizedState,x!==null){if(x.dehydrated!==null)return A5(v),v.flags|=128,null;if((g&v.child.childLanes)!==0)return _B(w,v,g);return A5(v),w=i1(w,v,g),w!==null?w.sibling:null}A5(v);break;case 19:var z=(w.flags&128)!==0;if(x=(g&v.childLanes)!==0,x||(Bg(w,v,g,!1),x=(g&v.childLanes)!==0),z){if(x)return EB(w,v,g);v.flags|=128}if(z=v.memoizedState,z!==null&&(z.rendering=null,z.tail=null,z.lastEffect=null),h(Uw,Uw.current,v),x)break;else return null;case 22:return v.lanes=0,DB(w,v,g,v.pendingProps);case 24:L5(v,Ww,w.memoizedState.cache)}return i1(w,v,g)}function y7(w,v,g){if(v._debugNeedsRemount&&w!==null){g=T8(v.type,v.key,v.pendingProps,v._debugOwner||null,v.mode,v.lanes),g._debugStack=v._debugStack,g._debugTask=v._debugTask;var x=v.return;if(x===null)throw Error("Cannot swap the root fiber.");if(w.alternate=null,v.alternate=null,g.index=v.index,g.sibling=v.sibling,g.return=v.return,g.ref=v.ref,g._debugInfo=v._debugInfo,v===x.child)x.child=g;else{var z=x.child;if(z===null)throw Error("Expected parent to have a child.");for(;z.sibling!==v;)if(z=z.sibling,z===null)throw Error("Expected to find the previous sibling.");z.sibling=g}return v=x.deletions,v===null?(x.deletions=[w],x.flags|=16):v.push(w),g.flags|=2,g}if(w!==null)if(w.memoizedProps!==v.pendingProps||v.type!==w.type)Lw=!0;else{if(!l7(w,g)&&(v.flags&128)===0)return Lw=!1,oq(w,v,g);Lw=(w.flags&131072)!==0?!0:!1}else{if(Lw=!1,x=D0)M5(),x=(v.flags&1048576)!==0;x&&(x=v.index,M5(),IZ(v,Bx,x))}switch(v.lanes=0,v.tag){case 16:w:if(x=v.pendingProps,w=I5(v.elementType),v.type=w,typeof w==="function")d8(w)?(x=Rv(w,x),v.tag=1,v.type=w=Wv(w),v=PB(null,v,w,x,g)):(v.tag=0,N7(v,w),v.type=w=Wv(w),v=E7(null,v,w,x,g));else{if(w!==void 0&&w!==null){if(z=w.$$typeof,z===r4){v.tag=11,v.type=w=S8(w),v=OB(null,v,w,x,g);break w}else if(z===Z6){v.tag=14,v=RB(null,v,w,x,g);break w}}throw v="",w!==null&&typeof w==="object"&&w.$$typeof===A2&&(v=" Did you wrap a component in React.lazy() more than once?"),g=b0(w)||w,Error("Element type is invalid. Received a promise that resolves to: "+g+". Lazy element type must resolve to a class or function."+v)}return v;case 0:return E7(w,v,v.type,v.pendingProps,g);case 1:return x=v.type,z=Rv(x,v.pendingProps),PB(w,v,x,z,g);case 3:w:{if(C(v,v.stateNode.containerInfo),w===null)throw Error("Should have a current fiber. This is a bug in React.");x=v.pendingProps;var G=v.memoizedState;z=G.element,w7(w,v),k4(v,x,null,g);var Z=v.memoizedState;if(x=Z.cache,L5(v,Ww,x),x!==G.cache&&i8(v,[Ww],g,!0),D4(),x=Z.element,G.isDehydrated)if(G={element:x,isDehydrated:!1,cache:Z.cache},v.updateQueue.baseState=G,v.memoizedState=G,v.flags&256){v=CB(w,v,x,g);break w}else if(x!==z){z=M2(Error("This root received an early update, before anything was able hydrate. Switched the entire root to client rendering."),v),b4(z),v=CB(w,v,x,g);break w}else{switch(w=v.stateNode.containerInfo,w.nodeType){case 9:w=w.body;break;default:w=w.nodeName==="HTML"?w.ownerDocument.body:w}p0=j2(w.firstChild),Sw=v,D0=!0,S5=null,N1=!1,V2=null,u2=!0,g=rJ(v,null,x,g);for(v.child=g;g;)g.flags=g.flags&-3|4096,g=g.sibling}else{if(Lv(),x===z){v=i1(w,v,g);break w}fw(w,v,x,g)}v=v.child}return v;case 26:return T3(w,v),w===null?(g=ZH(v.type,null,v.pendingProps,null))?v.memoizedState=g:D0||(g=v.type,w=v.pendingProps,x=y(h5.current),x=o3(x).createElement(g),x[Nw]=v,x[sw]=w,Ew(x,g,w),z0(x),v.stateNode=x):v.memoizedState=ZH(v.type,w.memoizedProps,v.pendingProps,w.memoizedState),null;case 27:return t(v),w===null&&D0&&(x=y(h5.current),z=S(),x=v.stateNode=zH(v.type,v.pendingProps,x,z,!1),N1||(z=sX(x,v.type,v.pendingProps,z),z!==null&&(Yv(v,0).serverProps=z)),Sw=v,u2=!0,z=p0,k5(v.type)?(tz=z,p0=j2(x.firstChild)):p0=z),fw(w,v,v.pendingProps.children,g),T3(w,v),w===null&&(v.flags|=4194304),v.child;case 5:return w===null&&D0&&(G=S(),x=F8(v.type,G.ancestorInfo),z=p0,(Z=!z)||(Z=dU(z,v.type,v.pendingProps,u2),Z!==null?(v.stateNode=Z,N1||(G=sX(Z,v.type,v.pendingProps,G),G!==null&&(Yv(v,0).serverProps=G)),Sw=v,p0=j2(Z.firstChild),u2=!1,G=!0):G=!1,Z=!G),Z&&(x&&Q3(v,z),Y5(v))),t(v),z=v.type,G=v.pendingProps,Z=w!==null?w.memoizedProps:null,x=G.children,U9(z,G)?x=null:Z!==null&&U9(z,Z)&&(v.flags|=32),v.memoizedState!==null&&(z=G7(w,v,lq,null,null,g),mx._currentValue=z),T3(w,v),fw(w,v,x,g),v.child;case 6:return w===null&&D0&&(g=v.pendingProps,w=S(),x=w.ancestorInfo.current,g=x!=null?v3(g,x.tag,w.ancestorInfo.implicitRootScope):!0,w=p0,(x=!w)||(x=TU(w,v.pendingProps,u2),x!==null?(v.stateNode=x,Sw=v,p0=null,x=!0):x=!1,x=!x),x&&(g&&Q3(v,w),Y5(v))),null;case 13:return _B(w,v,g);case 4:return C(v,v.stateNode.containerInfo),x=v.pendingProps,w===null?v.child=dv(v,null,x,g):fw(w,v,x,g),v.child;case 11:return OB(w,v,v.type,v.pendingProps,g);case 7:return fw(w,v,v.pendingProps,g),v.child;case 8:return fw(w,v,v.pendingProps.children,g),v.child;case 12:return v.flags|=4,v.flags|=2048,x=v.stateNode,x.effectDuration=-0,x.passiveEffectDuration=-0,fw(w,v,v.pendingProps.children,g),v.child;case 10:return x=v.type,z=v.pendingProps,G=z.value,"value"in z||IQ||(IQ=!0,console.error("The `value` prop is required for the `<Context.Provider>`. Did you misspell it or forget to pass it?")),L5(v,x,G),fw(w,v,z.children,g),v.child;case 9:return z=v.type._context,x=v.pendingProps.children,typeof x!=="function"&&console.error("A context consumer was rendered with multiple children, or a child that isn't a function. A context consumer expects a single child that is a function. If you did pass a function, make sure there is no trailing or leading whitespace around it."),Iv(v),z=ww(z),x=Kz(x,z,void 0),v.flags|=1,fw(w,v,x,g),v.child;case 14:return RB(w,v,v.type,v.pendingProps,g);case 15:return VB(w,v,v.type,v.pendingProps,g);case 19:return EB(w,v,g);case 31:return nq(w,v,g);case 22:return DB(w,v,g,v.pendingProps);case 24:return Iv(v),x=ww(Ww),w===null?(z=t8(),z===null&&(z=a0,G=r8(),z.pooledCache=G,bv(G),G!==null&&(z.pooledCacheLanes|=g),z=G),v.memoizedState={parent:x,cache:z},e8(v),L5(v,Ww,z)):((w.lanes&g)!==0&&(w7(w,v),k4(v,null,null,g),D4()),z=w.memoizedState,G=v.memoizedState,z.parent!==x?(z={parent:x,cache:x},v.memoizedState=z,v.lanes===0&&(v.memoizedState=v.updateQueue.baseState=z),L5(v,Ww,x)):(x=G.cache,L5(v,Ww,x),x!==z.cache&&i8(v,[Ww],g,!0))),fw(w,v,v.pendingProps.children,g),v.child;case 29:throw v.pendingProps}throw Error("Unknown unit of work tag ("+v.tag+"). This error is likely caused by a bug in React. Please file an issue.")}function r1(w){w.flags|=4}function a7(w,v,g,x,z){if(v=(w.mode&WW)!==B0)v=!1;if(v){if(w.flags|=16777216,(z&335544128)===z)if(w.stateNode.complete)w.flags|=8192;else if(UX())w.flags|=8192;else throw Sv=C6,Mz}else w.flags&=-16777217}function NB(w,v){if(v.type!=="stylesheet"||(v.state.loading&s2)!==nv)w.flags&=-16777217;else if(w.flags|=16777216,!QH(v))if(UX())w.flags|=8192;else throw Sv=C6,Mz}function u3(w,v){v!==null&&(w.flags|=4),w.flags&16384&&(v=w.tag!==22?vg():536870912,w.lanes|=v,yv|=v)}function _4(w,v){if(!D0)switch(w.tailMode){case"hidden":v=w.tail;for(var g=null;v!==null;)v.alternate!==null&&(g=v),v=v.sibling;g===null?w.tail=null:g.sibling=null;break;case"collapsed":g=w.tail;for(var x=null;g!==null;)g.alternate!==null&&(x=g),g=g.sibling;x===null?v||w.tail===null?w.tail=null:w.tail.sibling=null:x.sibling=null}}function r0(w){var v=w.alternate!==null&&w.alternate.child===w.child,g=0,x=0;if(v)if((w.mode&Y0)!==B0){for(var{selfBaseDuration:z,child:G}=w;G!==null;)g|=G.lanes|G.childLanes,x|=G.subtreeFlags&65011712,x|=G.flags&65011712,z+=G.treeBaseDuration,G=G.sibling;w.treeBaseDuration=z}else for(z=w.child;z!==null;)g|=z.lanes|z.childLanes,x|=z.subtreeFlags&65011712,x|=z.flags&65011712,z.return=w,z=z.sibling;else if((w.mode&Y0)!==B0){z=w.actualDuration,G=w.selfBaseDuration;for(var Z=w.child;Z!==null;)g|=Z.lanes|Z.childLanes,x|=Z.subtreeFlags,x|=Z.flags,z+=Z.actualDuration,G+=Z.treeBaseDuration,Z=Z.sibling;w.actualDuration=z,w.treeBaseDuration=G}else for(z=w.child;z!==null;)g|=z.lanes|z.childLanes,x|=z.subtreeFlags,x|=z.flags,z.return=w,z=z.sibling;return w.subtreeFlags|=x,w.childLanes=g,v}function tq(w,v,g){var x=v.pendingProps;switch(y8(v),v.tag){case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return r0(v),null;case 1:return r0(v),null;case 3:if(g=v.stateNode,x=null,w!==null&&(x=w.memoizedState.cache),v.memoizedState.cache!==x&&(v.flags|=2048),c1(Ww,v),T(v),g.pendingContext&&(g.context=g.pendingContext,g.pendingContext=null),w===null||w.child===null)Zg(v)?(c8(),r1(v)):w===null||w.memoizedState.isDehydrated&&(v.flags&256)===0||(v.flags|=1024,a8());return r0(v),null;case 26:var{type:z,memoizedState:G}=v;return w===null?(r1(v),G!==null?(r0(v),NB(v,G)):(r0(v),a7(v,z,null,x,g))):G?G!==w.memoizedState?(r1(v),r0(v),NB(v,G)):(r0(v),v.flags&=-16777217):(w=w.memoizedProps,w!==x&&r1(v),r0(v),a7(v,z,w,x,g)),null;case 27:if(o(v),g=y(h5.current),z=v.type,w!==null&&v.stateNode!=null)w.memoizedProps!==x&&r1(v);else{if(!x){if(v.stateNode===null)throw Error("We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue.");return r0(v),null}w=S(),Zg(v)?OZ(v,w):(w=zH(z,x,g,w,!0),v.stateNode=w,r1(v))}return r0(v),null;case 5:if(o(v),z=v.type,w!==null&&v.stateNode!=null)w.memoizedProps!==x&&r1(v);else{if(!x){if(v.stateNode===null)throw Error("We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue.");return r0(v),null}var Z=S();if(Zg(v))OZ(v,Z);else{switch(G=y(h5.current),F8(z,Z.ancestorInfo),Z=Z.context,G=o3(G),Z){case g4:G=G.createElementNS(Vg,z);break;case z8:G=G.createElementNS(q6,z);break;default:switch(z){case"svg":G=G.createElementNS(Vg,z);break;case"math":G=G.createElementNS(q6,z);break;case"script":G=G.createElement("div"),G.innerHTML="<script></script>",G=G.removeChild(G.firstChild);break;case"select":G=typeof x.is==="string"?G.createElement("select",{is:x.is}):G.createElement("select"),x.multiple?G.multiple=!0:x.size&&(G.size=x.size);break;default:G=typeof x.is==="string"?G.createElement(z,{is:x.is}):G.createElement(z),z.indexOf("-")===-1&&(z!==z.toLowerCase()&&console.error("<%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.",z),Object.prototype.toString.call(G)!=="[object HTMLUnknownElement]"||v1.call(aQ,z)||(aQ[z]=!0,console.error("The tag <%s> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter.",z)))}}G[Nw]=v,G[sw]=x;w:for(Z=v.child;Z!==null;){if(Z.tag===5||Z.tag===6)G.appendChild(Z.stateNode);else if(Z.tag!==4&&Z.tag!==27&&Z.child!==null){Z.child.return=Z,Z=Z.child;continue}if(Z===v)break w;for(;Z.sibling===null;){if(Z.return===null||Z.return===v)break w;Z=Z.return}Z.sibling.return=Z.return,Z=Z.sibling}v.stateNode=G;w:switch(Ew(G,z,x),z){case"button":case"input":case"select":case"textarea":x=!!x.autoFocus;break w;case"img":x=!0;break w;default:x=!1}x&&r1(v)}}return r0(v),a7(v,v.type,w===null?null:w.memoizedProps,v.pendingProps,g),null;case 6:if(w&&v.stateNode!=null)w.memoizedProps!==x&&r1(v);else{if(typeof x!=="string"&&v.stateNode===null)throw Error("We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue.");if(w=y(h5.current),g=S(),Zg(v)){if(w=v.stateNode,g=v.memoizedProps,z=!N1,x=null,G=Sw,G!==null)switch(G.tag){case 3:z&&(z=gH(w,g,x),z!==null&&(Yv(v,0).serverProps=z));break;case 27:case 5:x=G.memoizedProps,z&&(z=gH(w,g,x),z!==null&&(Yv(v,0).serverProps=z))}w[Nw]=v,w=w.nodeValue===g||x!==null&&x.suppressHydrationWarning===!0||uX(w.nodeValue,g)?!0:!1,w||Y5(v,!0)}else z=g.ancestorInfo.current,z!=null&&v3(x,z.tag,g.ancestorInfo.implicitRootScope),w=o3(w).createTextNode(x),w[Nw]=v,v.stateNode=w}return r0(v),null;case 31:if(g=v.memoizedState,w===null||w.memoizedState!==null){if(x=Zg(v),g!==null){if(w===null){if(!x)throw Error("A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React.");if(w=v.memoizedState,w=w!==null?w.dehydrated:null,!w)throw Error("Expected to have a hydrated activity instance. This error is likely caused by a bug in React. Please file an issue.");w[Nw]=v,r0(v),(v.mode&Y0)!==B0&&g!==null&&(w=v.child,w!==null&&(v.treeBaseDuration-=w.treeBaseDuration))}else c8(),Lv(),(v.flags&128)===0&&(g=v.memoizedState=null),v.flags|=4,r0(v),(v.mode&Y0)!==B0&&g!==null&&(w=v.child,w!==null&&(v.treeBaseDuration-=w.treeBaseDuration));w=!1}else g=a8(),w!==null&&w.memoizedState!==null&&(w.memoizedState.hydrationErrors=g),w=!0;if(!w){if(v.flags&256)return I2(v),v;return I2(v),null}if((v.flags&128)!==0)throw Error("Client rendering an Activity suspended it again. This is a bug in React.")}return r0(v),null;case 13:if(x=v.memoizedState,w===null||w.memoizedState!==null&&w.memoizedState.dehydrated!==null){if(z=x,G=Zg(v),z!==null&&z.dehydrated!==null){if(w===null){if(!G)throw Error("A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React.");if(G=v.memoizedState,G=G!==null?G.dehydrated:null,!G)throw Error("Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue.");G[Nw]=v,r0(v),(v.mode&Y0)!==B0&&z!==null&&(z=v.child,z!==null&&(v.treeBaseDuration-=z.treeBaseDuration))}else c8(),Lv(),(v.flags&128)===0&&(z=v.memoizedState=null),v.flags|=4,r0(v),(v.mode&Y0)!==B0&&z!==null&&(z=v.child,z!==null&&(v.treeBaseDuration-=z.treeBaseDuration));z=!1}else z=a8(),w!==null&&w.memoizedState!==null&&(w.memoizedState.hydrationErrors=z),z=!0;if(!z){if(v.flags&256)return I2(v),v;return I2(v),null}}if(I2(v),(v.flags&128)!==0)return v.lanes=g,(v.mode&Y0)!==B0&&O4(v),v;return g=x!==null,w=w!==null&&w.memoizedState!==null,g&&(x=v.child,z=null,x.alternate!==null&&x.alternate.memoizedState!==null&&x.alternate.memoizedState.cachePool!==null&&(z=x.alternate.memoizedState.cachePool.pool),G=null,x.memoizedState!==null&&x.memoizedState.cachePool!==null&&(G=x.memoizedState.cachePool.pool),G!==z&&(x.flags|=2048)),g!==w&&g&&(v.child.flags|=8192),u3(v,v.updateQueue),r0(v),(v.mode&Y0)!==B0&&g&&(w=v.child,w!==null&&(v.treeBaseDuration-=w.treeBaseDuration)),null;case 4:return T(v),w===null&&B9(v.stateNode.containerInfo),r0(v),null;case 10:return c1(v.type,v),r0(v),null;case 19:if(k0(Uw,v),x=v.memoizedState,x===null)return r0(v),null;if(z=(v.flags&128)!==0,G=x.rendering,G===null)if(z)_4(x,!1);else{if(Gw!==H5||w!==null&&(w.flags&128)!==0)for(w=v.child;w!==null;){if(G=O3(w),G!==null){v.flags|=128,_4(x,!1),w=G.updateQueue,v.updateQueue=w,u3(v,w),v.subtreeFlags=0,w=g;for(g=v.child;g!==null;)YZ(g,w),g=g.sibling;return h(Uw,Uw.current&ag|jx,v),D0&&a1(v,x.treeForkCount),v.child}w=w.sibling}x.tail!==null&&kw()>c6&&(v.flags|=128,z=!0,_4(x,!1),v.lanes=4194304)}else{if(!z)if(w=O3(G),w!==null){if(v.flags|=128,z=!0,w=w.updateQueue,v.updateQueue=w,u3(v,w),_4(x,!0),x.tail===null&&x.tailMode==="hidden"&&!G.alternate&&!D0)return r0(v),null}else 2*kw()-x.renderingStartTime>c6&&g!==536870912&&(v.flags|=128,z=!0,_4(x,!1),v.lanes=4194304);x.isBackwards?(G.sibling=v.child,v.child=G):(w=x.last,w!==null?w.sibling=G:v.child=G,x.last=G)}if(x.tail!==null)return w=x.tail,x.rendering=w,x.tail=w.sibling,x.renderingStartTime=kw(),w.sibling=null,g=Uw.current,g=z?g&ag|jx:g&ag,h(Uw,g,v),D0&&a1(v,x.treeForkCount),w;return r0(v),null;case 22:case 23:return I2(v),g7(v),x=v.memoizedState!==null,w!==null?w.memoizedState!==null!==x&&(v.flags|=8192):x&&(v.flags|=8192),x?(g&536870912)!==0&&(v.flags&128)===0&&(r0(v),v.subtreeFlags&6&&(v.flags|=8192)):r0(v),g=v.updateQueue,g!==null&&u3(v,g.retryQueue),g=null,w!==null&&w.memoizedState!==null&&w.memoizedState.cachePool!==null&&(g=w.memoizedState.cachePool.pool),x=null,v.memoizedState!==null&&v.memoizedState.cachePool!==null&&(x=v.memoizedState.cachePool.pool),x!==g&&(v.flags|=2048),w!==null&&k0(Ev,v),null;case 24:return g=null,w!==null&&(g=w.memoizedState.cache),v.memoizedState.cache!==g&&(v.flags|=2048),c1(Ww,v),r0(v),null;case 25:return null;case 30:return null}throw Error("Unknown unit of work tag ("+v.tag+"). This error is likely caused by a bug in React. Please file an issue.")}function pq(w,v){switch(y8(v),v.tag){case 1:return w=v.flags,w&65536?(v.flags=w&-65537|128,(v.mode&Y0)!==B0&&O4(v),v):null;case 3:return c1(Ww,v),T(v),w=v.flags,(w&65536)!==0&&(w&128)===0?(v.flags=w&-65537|128,v):null;case 26:case 27:case 5:return o(v),null;case 31:if(v.memoizedState!==null){if(I2(v),v.alternate===null)throw Error("Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue.");Lv()}return w=v.flags,w&65536?(v.flags=w&-65537|128,(v.mode&Y0)!==B0&&O4(v),v):null;case 13:if(I2(v),w=v.memoizedState,w!==null&&w.dehydrated!==null){if(v.alternate===null)throw Error("Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue.");Lv()}return w=v.flags,w&65536?(v.flags=w&-65537|128,(v.mode&Y0)!==B0&&O4(v),v):null;case 19:return k0(Uw,v),null;case 4:return T(v),null;case 10:return c1(v.type,v),null;case 22:case 23:return I2(v),g7(v),w!==null&&k0(Ev,v),w=v.flags,w&65536?(v.flags=w&-65537|128,(v.mode&Y0)!==B0&&O4(v),v):null;case 24:return c1(Ww,v),null;case 25:return null;default:return null}}function SB(w,v){switch(y8(v),v.tag){case 3:c1(Ww,v),T(v);break;case 26:case 27:case 5:o(v);break;case 4:T(v);break;case 31:v.memoizedState!==null&&I2(v);break;case 13:I2(v);break;case 19:k0(Uw,v);break;case 10:c1(v.type,v);break;case 22:case 23:I2(v),g7(v),w!==null&&k0(Ev,v);break;case 24:c1(Ww,v)}}function A1(w){return(w.mode&Y0)!==B0}function dB(w,v){A1(w)?(j1(),f4(v,w),b1()):f4(v,w)}function c7(w,v,g){A1(w)?(j1(),$g(g,w,v),b1()):$g(g,w,v)}function f4(w,v){try{var g=v.updateQueue,x=g!==null?g.lastEffect:null;if(x!==null){var z=x.next;g=z;do{if((g.tag&w)===w&&(x=void 0,(w&ow)!==f6&&(eg=!0),x=n(v,bW,g),(w&ow)!==f6&&(eg=!1),x!==void 0&&typeof x!=="function")){var G=void 0;G=(g.tag&k2)!==0?"useLayoutEffect":(g.tag&ow)!==0?"useInsertionEffect":"useEffect";var Z=void 0;Z=x===null?" You returned null. If your effect does not require clean up, return undefined (or nothing).":typeof x.then==="function"?`

It looks like you wrote `+G+`(async () => ...) or returned a Promise. Instead, write the async function inside your effect and call it immediately:

`+G+`(() => {
  async function fetchData() {
    // You can await here
    const response = await MyAPI.getData(someId);
    // ...
  }
  fetchData();
}, [someId]); // Or [] if effect doesn't need props or state

Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching`:" You returned: "+x,n(v,function(B,X){console.error("%s must not return anything besides a function, which is used for clean-up.%s",B,X)},G,Z)}g=g.next}while(g!==z)}}catch(B){S0(v,v.return,B)}}function $g(w,v,g){try{var x=v.updateQueue,z=x!==null?x.lastEffect:null;if(z!==null){var G=z.next;x=G;do{if((x.tag&w)===w){var Z=x.inst,B=Z.destroy;B!==void 0&&(Z.destroy=void 0,(w&ow)!==f6&&(eg=!0),z=v,n(z,jW,z,g,B),(w&ow)!==f6&&(eg=!1))}x=x.next}while(x!==G)}}catch(X){S0(v,v.return,X)}}function TB(w,v){A1(w)?(j1(),f4(v,w),b1()):f4(v,w)}function s7(w,v,g){A1(w)?(j1(),$g(g,w,v),b1()):$g(g,w,v)}function mB(w){var v=w.updateQueue;if(v!==null){var g=w.stateNode;w.type.defaultProps||"ref"in w.memoizedProps||rg||(g.props!==w.memoizedProps&&console.error("Expected %s props to match memoized props before processing the update queue. This might either be because of a bug in React, or because a component reassigns its own `this.props`. Please file an issue.",l(w)||"instance"),g.state!==w.memoizedState&&console.error("Expected %s state to match memoized state before processing the update queue. This might either be because of a bug in React, or because a component reassigns its own `this.state`. Please file an issue.",l(w)||"instance"));try{n(w,lZ,v,g)}catch(x){S0(w,w.return,x)}}}function eq(w,v,g){return w.getSnapshotBeforeUpdate(v,g)}function wU(w,v){var{memoizedProps:g,memoizedState:x}=v;v=w.stateNode,w.type.defaultProps||"ref"in w.memoizedProps||rg||(v.props!==w.memoizedProps&&console.error("Expected %s props to match memoized props before getSnapshotBeforeUpdate. This might either be because of a bug in React, or because a component reassigns its own `this.props`. Please file an issue.",l(w)||"instance"),v.state!==w.memoizedState&&console.error("Expected %s state to match memoized state before getSnapshotBeforeUpdate. This might either be because of a bug in React, or because a component reassigns its own `this.state`. Please file an issue.",l(w)||"instance"));try{var z=Rv(w.type,g),G=n(w,eq,v,z,x);g=bQ,G!==void 0||g.has(w.type)||(g.add(w.type),n(w,function(){console.error("%s.getSnapshotBeforeUpdate(): A snapshot value (or null) must be returned. You have returned undefined.",l(w))})),v.__reactInternalSnapshotBeforeUpdate=G}catch(Z){S0(w,w.return,Z)}}function uB(w,v,g){g.props=Rv(w.type,w.memoizedProps),g.state=w.memoizedState,A1(w)?(j1(),n(w,mJ,w,v,g),b1()):n(w,mJ,w,v,g)}function vU(w){var v=w.ref;if(v!==null){switch(w.tag){case 26:case 27:case 5:var g=w.stateNode;break;case 30:g=w.stateNode;break;default:g=w.stateNode}if(typeof v==="function")if(A1(w))try{j1(),w.refCleanup=v(g)}finally{b1()}else w.refCleanup=v(g);else typeof v==="string"?console.error("String refs are no longer supported."):v.hasOwnProperty("current")||console.error("Unexpected ref object provided for %s. Use either a ref-setter function or React.createRef().",l(w)),v.current=g}}function E4(w,v){try{n(w,vU,w)}catch(g){S0(w,v,g)}}function O1(w,v){var{ref:g,refCleanup:x}=w;if(g!==null)if(typeof x==="function")try{if(A1(w))try{j1(),n(w,x)}finally{b1(w)}else n(w,x)}catch(z){S0(w,v,z)}finally{w.refCleanup=null,w=w.alternate,w!=null&&(w.refCleanup=null)}else if(typeof g==="function")try{if(A1(w))try{j1(),n(w,g,null)}finally{b1(w)}else n(w,g,null)}catch(z){S0(w,v,z)}else g.current=null}function lB(w,v,g,x){var z=w.memoizedProps,G=z.id,Z=z.onCommit;z=z.onRender,v=v===null?"mount":"update",k6&&(v="nested-update"),typeof z==="function"&&z(G,v,w.actualDuration,w.treeBaseDuration,w.actualStartTime,g),typeof Z==="function"&&Z(G,v,x,g)}function gU(w,v,g,x){var z=w.memoizedProps;w=z.id,z=z.onPostCommit,v=v===null?"mount":"update",k6&&(v="nested-update"),typeof z==="function"&&z(w,v,x,g)}function yB(w){var{type:v,memoizedProps:g,stateNode:x}=w;try{n(w,VU,x,v,g,w)}catch(z){S0(w,w.return,z)}}function i7(w,v,g){try{n(w,kU,w.stateNode,w.type,g,v,w)}catch(x){S0(w,w.return,x)}}function aB(w){return w.tag===5||w.tag===3||w.tag===26||w.tag===27&&k5(w.type)||w.tag===4}function r7(w){w:for(;;){for(;w.sibling===null;){if(w.return===null||aB(w.return))return null;w=w.return}w.sibling.return=w.return;for(w=w.sibling;w.tag!==5&&w.tag!==6&&w.tag!==18;){if(w.tag===27&&k5(w.type))continue w;if(w.flags&2)continue w;if(w.child===null||w.tag===4)continue w;else w.child.return=w,w=w.child}if(!(w.flags&2))return w.stateNode}}function n7(w,v,g){var x=w.tag;if(x===5||x===6)w=w.stateNode,v?(tX(g),(g.nodeType===9?g.body:g.nodeName==="HTML"?g.ownerDocument.body:g).insertBefore(w,v)):(tX(g),v=g.nodeType===9?g.body:g.nodeName==="HTML"?g.ownerDocument.body:g,v.appendChild(w),g=g._reactRootContainer,g!==null&&g!==void 0||v.onclick!==null||(v.onclick=l1));else if(x!==4&&(x===27&&k5(w.type)&&(g=w.stateNode,v=null),w=w.child,w!==null))for(n7(w,v,g),w=w.sibling;w!==null;)n7(w,v,g),w=w.sibling}function l3(w,v,g){var x=w.tag;if(x===5||x===6)w=w.stateNode,v?g.insertBefore(w,v):g.appendChild(w);else if(x!==4&&(x===27&&k5(w.type)&&(g=w.stateNode),w=w.child,w!==null))for(l3(w,v,g),w=w.sibling;w!==null;)l3(w,v,g),w=w.sibling}function xU(w){for(var v,g=w.return;g!==null;){if(aB(g)){v=g;break}g=g.return}if(v==null)throw Error("Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue.");switch(v.tag){case 27:v=v.stateNode,g=r7(w),l3(w,g,v);break;case 5:g=v.stateNode,v.flags&32&&(oX(g),v.flags&=-33),v=r7(w),l3(w,v,g);break;case 3:case 4:v=v.stateNode.containerInfo,g=r7(w),n7(w,g,v);break;default:throw Error("Invalid host parent fiber. This error is likely caused by a bug in React. Please file an issue.")}}function cB(w){var{stateNode:v,memoizedProps:g}=w;try{n(w,aU,w.type,g,v,w)}catch(x){S0(w,w.return,x)}}function sB(w,v){return v.tag===31?(v=v.memoizedState,w.memoizedState!==null&&v===null):v.tag===13?(w=w.memoizedState,v=v.memoizedState,w!==null&&w.dehydrated!==null&&(v===null||v.dehydrated===null)):v.tag===3?w.memoizedState.isDehydrated&&(v.flags&256)===0:!1}function zU(w,v){if(w=w.containerInfo,rz=X8,w=XZ(w),C8(w)){if("selectionStart"in w)var g={start:w.selectionStart,end:w.selectionEnd};else w:{g=(g=w.ownerDocument)&&g.defaultView||window;var x=g.getSelection&&g.getSelection();if(x&&x.rangeCount!==0){g=x.anchorNode;var{anchorOffset:z,focusNode:G}=x;x=x.focusOffset;try{g.nodeType,G.nodeType}catch(u){g=null;break w}var Z=0,B=-1,X=-1,H=0,Y=0,L=w,U=null;v:for(;;){for(var R;;){if(L!==g||z!==0&&L.nodeType!==3||(B=Z+z),L!==G||x!==0&&L.nodeType!==3||(X=Z+x),L.nodeType===3&&(Z+=L.nodeValue.length),(R=L.firstChild)===null)break;U=L,L=R}for(;;){if(L===w)break v;if(U===g&&++H===z&&(B=Z),U===G&&++Y===x&&(X=Z),(R=L.nextSibling)!==null)break;L=U,U=L.parentNode}L=R}g=B===-1||X===-1?null:{start:B,end:X}}else g=null}g=g||{start:0,end:0}}else g=null;nz={focusedElem:w,selectionRange:g},X8=!1;for(hw=v;hw!==null;)if(v=hw,w=v.child,(v.subtreeFlags&1028)!==0&&w!==null)w.return=v,hw=w;else for(;hw!==null;){switch(w=v=hw,g=w.alternate,z=w.flags,w.tag){case 0:if((z&4)!==0&&(w=w.updateQueue,w=w!==null?w.events:null,w!==null))for(g=0;g<w.length;g++)z=w[g],z.ref.impl=z.nextImpl;break;case 11:case 15:break;case 1:(z&1024)!==0&&g!==null&&wU(w,g);break;case 3:if((z&1024)!==0){if(w=w.stateNode.containerInfo,g=w.nodeType,g===9)K9(w);else if(g===1)switch(w.nodeName){case"HEAD":case"HTML":case"BODY":K9(w);break;default:w.textContent=""}}break;case 5:case 26:case 27:case 6:case 4:case 17:break;default:if((z&1024)!==0)throw Error("This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue.")}if(w=v.sibling,w!==null){w.return=v.return,hw=w;break}hw=v.return}}function iB(w,v,g){var x=Y2(),z=M1(),G=L1(),Z=I1(),B=g.flags;switch(g.tag){case 0:case 11:case 15:R1(w,g),B&4&&dB(g,k2|a2);break;case 1:if(R1(w,g),B&4)if(w=g.stateNode,v===null)g.type.defaultProps||"ref"in g.memoizedProps||rg||(w.props!==g.memoizedProps&&console.error("Expected %s props to match memoized props before componentDidMount. This might either be because of a bug in React, or because a component reassigns its own `this.props`. Please file an issue.",l(g)||"instance"),w.state!==g.memoizedState&&console.error("Expected %s state to match memoized state before componentDidMount. This might either be because of a bug in React, or because a component reassigns its own `this.state`. Please file an issue.",l(g)||"instance")),A1(g)?(j1(),n(g,Wz,g,w),b1()):n(g,Wz,g,w);else{var X=Rv(g.type,v.memoizedProps);v=v.memoizedState,g.type.defaultProps||"ref"in g.memoizedProps||rg||(w.props!==g.memoizedProps&&console.error("Expected %s props to match memoized props before componentDidUpdate. This might either be because of a bug in React, or because a component reassigns its own `this.props`. Please file an issue.",l(g)||"instance"),w.state!==g.memoizedState&&console.error("Expected %s state to match memoized state before componentDidUpdate. This might either be because of a bug in React, or because a component reassigns its own `this.state`. Please file an issue.",l(g)||"instance")),A1(g)?(j1(),n(g,SJ,g,w,X,v,w.__reactInternalSnapshotBeforeUpdate),b1()):n(g,SJ,g,w,X,v,w.__reactInternalSnapshotBeforeUpdate)}B&64&&mB(g),B&512&&E4(g,g.return);break;case 3:if(v=s1(),R1(w,g),B&64&&(B=g.updateQueue,B!==null)){if(X=null,g.child!==null)switch(g.child.tag){case 27:case 5:X=g.child.stateNode;break;case 1:X=g.child.stateNode}try{n(g,lZ,B,X)}catch(Y){S0(g,g.return,Y)}}w.effectDuration+=K3(v);break;case 27:v===null&&B&4&&cB(g);case 26:case 5:if(R1(w,g),v===null){if(B&4)yB(g);else if(B&64){w=g.type,v=g.memoizedProps,X=g.stateNode;try{n(g,DU,X,w,v,g)}catch(Y){S0(g,g.return,Y)}}}B&512&&E4(g,g.return);break;case 12:if(B&4){B=s1(),R1(w,g),w=g.stateNode,w.effectDuration+=A4(B);try{n(g,lB,g,v,d5,w.effectDuration)}catch(Y){S0(g,g.return,Y)}}else R1(w,g);break;case 31:R1(w,g),B&4&&oB(w,g);break;case 13:R1(w,g),B&4&&tB(w,g),B&64&&(w=g.memoizedState,w!==null&&(w=w.dehydrated,w!==null&&(B=qU.bind(null,g),mU(w,B))));break;case 22:if(B=g.memoizedState!==null||X5,!B){v=v!==null&&v.memoizedState!==null||Iw,X=X5;var H=Iw;X5=B,(Iw=v)&&!H?(V1(w,g,(g.subtreeFlags&8772)!==0),(g.mode&Y0)!==B0&&0<=G0&&0<=Z0&&0.05<Z0-G0&&G3(g,G0,Z0)):R1(w,g),X5=X,Iw=H}break;case 30:break;default:R1(w,g)}(g.mode&Y0)!==B0&&0<=G0&&0<=Z0&&((Xw||0.05<zw)&&K1(g,G0,Z0,zw,vw),g.alternate===null&&g.return!==null&&g.return.alternate!==null&&0.05<Z0-G0&&(sB(g.return.alternate,g.return)||U1(g,G0,Z0,"Mount"))),L2(x),Y1(z),vw=G,Xw=Z}function rB(w){var v=w.alternate;v!==null&&(w.alternate=null,rB(v)),w.child=null,w.deletions=null,w.sibling=null,w.tag===5&&(v=w.stateNode,v!==null&&c(v)),w.stateNode=null,w._debugOwner=null,w.return=null,w.dependencies=null,w.memoizedProps=null,w.memoizedState=null,w.pendingProps=null,w.stateNode=null,w.updateQueue=null}function n1(w,v,g){for(g=g.child;g!==null;)nB(w,v,g),g=g.sibling}function nB(w,v,g){if(mw&&typeof mw.onCommitFiberUnmount==="function")try{mw.onCommitFiberUnmount(Og,g)}catch(H){C1||(C1=!0,console.error("React instrumentation encountered an error: %o",H))}var x=Y2(),z=M1(),G=L1(),Z=I1();switch(g.tag){case 26:Iw||O1(g,v),n1(w,v,g),g.memoizedState?g.memoizedState.count--:g.stateNode&&(w=g.stateNode,w.parentNode.removeChild(w));break;case 27:Iw||O1(g,v);var B=bw,X=H2;k5(g.type)&&(bw=g.stateNode,H2=!1),n1(w,v,g),n(g,a4,g.stateNode),bw=B,H2=X;break;case 5:Iw||O1(g,v);case 6:if(B=bw,X=H2,bw=null,n1(w,v,g),bw=B,H2=X,bw!==null)if(H2)try{n(g,PU,bw,g.stateNode)}catch(H){S0(g,v,H)}else try{n(g,hU,bw,g.stateNode)}catch(H){S0(g,v,H)}break;case 18:bw!==null&&(H2?(w=bw,pX(w.nodeType===9?w.body:w.nodeName==="HTML"?w.ownerDocument.body:w,g.stateNode),Ig(w)):pX(bw,g.stateNode));break;case 4:B=bw,X=H2,bw=g.stateNode.containerInfo,H2=!0,n1(w,v,g),bw=B,H2=X;break;case 0:case 11:case 14:case 15:$g(ow,g,v),Iw||c7(g,v,k2),n1(w,v,g);break;case 1:Iw||(O1(g,v),B=g.stateNode,typeof B.componentWillUnmount==="function"&&uB(g,v,B)),n1(w,v,g);break;case 21:n1(w,v,g);break;case 22:Iw=(B=Iw)||g.memoizedState!==null,n1(w,v,g),Iw=B;break;default:n1(w,v,g)}(g.mode&Y0)!==B0&&0<=G0&&0<=Z0&&(Xw||0.05<zw)&&K1(g,G0,Z0,zw,vw),L2(x),Y1(z),vw=G,Xw=Z}function oB(w,v){if(v.memoizedState===null&&(w=v.alternate,w!==null&&(w=w.memoizedState,w!==null))){w=w.dehydrated;try{n(v,lU,w)}catch(g){S0(v,v.return,g)}}}function tB(w,v){if(v.memoizedState===null&&(w=v.alternate,w!==null&&(w=w.memoizedState,w!==null&&(w=w.dehydrated,w!==null))))try{n(v,yU,w)}catch(g){S0(v,v.return,g)}}function GU(w){switch(w.tag){case 31:case 13:case 19:var v=w.stateNode;return v===null&&(v=w.stateNode=new jQ),v;case 22:return w=w.stateNode,v=w._retryCache,v===null&&(v=w._retryCache=new jQ),v;default:throw Error("Unexpected Suspense handler tag ("+w.tag+"). This is a bug in React.")}}function y3(w,v){var g=GU(w);v.forEach(function(x){if(!g.has(x)){if(g.add(x),_1)if(ng!==null&&og!==null)T4(og,ng);else throw Error("Expected finished root and lanes to be set. This is a bug in React.");var z=UU.bind(null,w,x);x.then(z,z)}})}function B2(w,v){var g=v.deletions;if(g!==null)for(var x=0;x<g.length;x++){var z=w,G=v,Z=g[x],B=Y2(),X=G;w:for(;X!==null;){switch(X.tag){case 27:if(k5(X.type)){bw=X.stateNode,H2=!1;break w}break;case 5:bw=X.stateNode,H2=!1;break w;case 3:case 4:bw=X.stateNode.containerInfo,H2=!0;break w}X=X.return}if(bw===null)throw Error("Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue.");nB(z,G,Z),bw=null,H2=!1,(Z.mode&Y0)!==B0&&0<=G0&&0<=Z0&&0.05<Z0-G0&&U1(Z,G0,Z0,"Unmount"),L2(B),z=Z,G=z.alternate,G!==null&&(G.return=null),z.return=null}if(v.subtreeFlags&13886)for(v=v.child;v!==null;)pB(v,w),v=v.sibling}function pB(w,v){var g=Y2(),x=M1(),z=L1(),G=I1(),Z=w.alternate,B=w.flags;switch(w.tag){case 0:case 11:case 14:case 15:B2(v,w),X2(w),B&4&&($g(ow|a2,w,w.return),f4(ow|a2,w),c7(w,w.return,k2|a2));break;case 1:if(B2(v,w),X2(w),B&512&&(Iw||Z===null||O1(Z,Z.return)),B&64&&X5&&(B=w.updateQueue,B!==null&&(Z=B.callbacks,Z!==null))){var X=B.shared.hiddenCallbacks;B.shared.hiddenCallbacks=X===null?Z:X.concat(Z)}break;case 26:if(X=Z1,B2(v,w),X2(w),B&512&&(Iw||Z===null||O1(Z,Z.return)),B&4){var H=Z!==null?Z.memoizedState:null;if(B=w.memoizedState,Z===null)if(B===null)if(w.stateNode===null){w:{B=w.type,Z=w.memoizedProps,X=X.ownerDocument||X;v:switch(B){case"title":if(H=X.getElementsByTagName("title")[0],!H||H[t4]||H[Nw]||H.namespaceURI===Vg||H.hasAttribute("itemprop"))H=X.createElement(B),X.head.insertBefore(H,X.querySelector("head > title"));Ew(H,B,Z),H[Nw]=w,z0(H),B=H;break w;case"link":var Y=HH("link","href",X).get(B+(Z.href||""));if(Y){for(var L=0;L<Y.length;L++)if(H=Y[L],H.getAttribute("href")===(Z.href==null||Z.href===""?null:Z.href)&&H.getAttribute("rel")===(Z.rel==null?null:Z.rel)&&H.getAttribute("title")===(Z.title==null?null:Z.title)&&H.getAttribute("crossorigin")===(Z.crossOrigin==null?null:Z.crossOrigin)){Y.splice(L,1);break v}}H=X.createElement(B),Ew(H,B,Z),X.head.appendChild(H);break;case"meta":if(Y=HH("meta","content",X).get(B+(Z.content||""))){for(L=0;L<Y.length;L++)if(H=Y[L],u0(Z.content,"content"),H.getAttribute("content")===(Z.content==null?null:""+Z.content)&&H.getAttribute("name")===(Z.name==null?null:Z.name)&&H.getAttribute("property")===(Z.property==null?null:Z.property)&&H.getAttribute("http-equiv")===(Z.httpEquiv==null?null:Z.httpEquiv)&&H.getAttribute("charset")===(Z.charSet==null?null:Z.charSet)){Y.splice(L,1);break v}}H=X.createElement(B),Ew(H,B,Z),X.head.appendChild(H);break;default:throw Error('getNodesForType encountered a type it did not expect: "'+B+'". This is a bug in React.')}H[Nw]=w,z0(H),B=H}w.stateNode=B}else JH(X,w.type,w.stateNode);else w.stateNode=XH(X,B,w.memoizedProps);else H!==B?(H===null?Z.stateNode!==null&&(Z=Z.stateNode,Z.parentNode.removeChild(Z)):H.count--,B===null?JH(X,w.type,w.stateNode):XH(X,B,w.memoizedProps)):B===null&&w.stateNode!==null&&i7(w,w.memoizedProps,Z.memoizedProps)}break;case 27:B2(v,w),X2(w),B&512&&(Iw||Z===null||O1(Z,Z.return)),Z!==null&&B&4&&i7(w,w.memoizedProps,Z.memoizedProps);break;case 5:if(B2(v,w),X2(w),B&512&&(Iw||Z===null||O1(Z,Z.return)),w.flags&32){X=w.stateNode;try{n(w,oX,X)}catch(i){S0(w,w.return,i)}}B&4&&w.stateNode!=null&&(X=w.memoizedProps,i7(w,X,Z!==null?Z.memoizedProps:X)),B&1024&&(Fz=!0,w.type!=="form"&&console.error("Unexpected host component type. Expected a form. This is a bug in React."));break;case 6:if(B2(v,w),X2(w),B&4){if(w.stateNode===null)throw Error("This should have a text node initialized. This error is likely caused by a bug in React. Please file an issue.");B=w.memoizedProps,Z=Z!==null?Z.memoizedProps:B,X=w.stateNode;try{n(w,FU,X,Z,B)}catch(i){S0(w,w.return,i)}}break;case 3:if(X=s1(),G8=null,H=Z1,Z1=t3(v.containerInfo),B2(v,w),Z1=H,X2(w),B&4&&Z!==null&&Z.memoizedState.isDehydrated)try{n(w,uU,v.containerInfo)}catch(i){S0(w,w.return,i)}Fz&&(Fz=!1,eB(w)),v.effectDuration+=K3(X);break;case 4:B=Z1,Z1=t3(w.stateNode.containerInfo),B2(v,w),X2(w),Z1=B;break;case 12:B=s1(),B2(v,w),X2(w),w.stateNode.effectDuration+=A4(B);break;case 31:B2(v,w),X2(w),B&4&&(B=w.updateQueue,B!==null&&(w.updateQueue=null,y3(w,B)));break;case 13:B2(v,w),X2(w),w.child.flags&8192&&w.memoizedState!==null!==(Z!==null&&Z.memoizedState!==null)&&(a6=kw()),B&4&&(B=w.updateQueue,B!==null&&(w.updateQueue=null,y3(w,B)));break;case 22:X=w.memoizedState!==null;var U=Z!==null&&Z.memoizedState!==null,R=X5,u=Iw;if(X5=R||X,Iw=u||U,B2(v,w),Iw=u,X5=R,U&&!X&&!R&&!u&&(w.mode&Y0)!==B0&&0<=G0&&0<=Z0&&0.05<Z0-G0&&G3(w,G0,Z0),X2(w),B&8192)w:for(v=w.stateNode,v._visibility=X?v._visibility&~Zx:v._visibility|Zx,!X||Z===null||U||X5||Iw||(Vv(w),(w.mode&Y0)!==B0&&0<=G0&&0<=Z0&&0.05<Z0-G0&&U1(w,G0,Z0,"Disconnect")),Z=null,v=w;;){if(v.tag===5||v.tag===26){if(Z===null){U=Z=v;try{H=U.stateNode,X?n(U,_U,H):n(U,NU,U.stateNode,U.memoizedProps)}catch(i){S0(U,U.return,i)}}}else if(v.tag===6){if(Z===null){U=v;try{Y=U.stateNode,X?n(U,fU,Y):n(U,SU,Y,U.memoizedProps)}catch(i){S0(U,U.return,i)}}}else if(v.tag===18){if(Z===null){U=v;try{L=U.stateNode,X?n(U,CU,L):n(U,EU,U.stateNode)}catch(i){S0(U,U.return,i)}}}else if((v.tag!==22&&v.tag!==23||v.memoizedState===null||v===w)&&v.child!==null){v.child.return=v,v=v.child;continue}if(v===w)break w;for(;v.sibling===null;){if(v.return===null||v.return===w)break w;Z===v&&(Z=null),v=v.return}Z===v&&(Z=null),v.sibling.return=v.return,v=v.sibling}B&4&&(B=w.updateQueue,B!==null&&(Z=B.retryQueue,Z!==null&&(B.retryQueue=null,y3(w,Z))));break;case 19:B2(v,w),X2(w),B&4&&(B=w.updateQueue,B!==null&&(w.updateQueue=null,y3(w,B)));break;case 30:break;case 21:break;default:B2(v,w),X2(w)}(w.mode&Y0)!==B0&&0<=G0&&0<=Z0&&((Xw||0.05<zw)&&K1(w,G0,Z0,zw,vw),w.alternate===null&&w.return!==null&&w.return.alternate!==null&&0.05<Z0-G0&&(sB(w.return.alternate,w.return)||U1(w,G0,Z0,"Mount"))),L2(g),Y1(x),vw=z,Xw=G}function X2(w){var v=w.flags;if(v&2){try{n(w,xU,w)}catch(g){S0(w,w.return,g)}w.flags&=-3}v&4096&&(w.flags&=-4097)}function eB(w){if(w.subtreeFlags&1024)for(w=w.child;w!==null;){var v=w;eB(v),v.tag===5&&v.flags&1024&&v.stateNode.reset(),w=w.sibling}}function R1(w,v){if(v.subtreeFlags&8772)for(v=v.child;v!==null;)iB(w,v.alternate,v),v=v.sibling}function wX(w){var v=Y2(),g=M1(),x=L1(),z=I1();switch(w.tag){case 0:case 11:case 14:case 15:c7(w,w.return,k2),Vv(w);break;case 1:O1(w,w.return);var G=w.stateNode;typeof G.componentWillUnmount==="function"&&uB(w,w.return,G),Vv(w);break;case 27:n(w,a4,w.stateNode);case 26:case 5:O1(w,w.return),Vv(w);break;case 22:w.memoizedState===null&&Vv(w);break;case 30:Vv(w);break;default:Vv(w)}(w.mode&Y0)!==B0&&0<=G0&&0<=Z0&&(Xw||0.05<zw)&&K1(w,G0,Z0,zw,vw),L2(v),Y1(g),vw=x,Xw=z}function Vv(w){for(w=w.child;w!==null;)wX(w),w=w.sibling}function vX(w,v,g,x){var z=Y2(),G=M1(),Z=L1(),B=I1(),X=g.flags;switch(g.tag){case 0:case 11:case 15:V1(w,g,x),dB(g,k2);break;case 1:if(V1(w,g,x),v=g.stateNode,typeof v.componentDidMount==="function"&&n(g,Wz,g,v),v=g.updateQueue,v!==null){w=g.stateNode;try{n(g,uq,v,w)}catch(H){S0(g,g.return,H)}}x&&X&64&&mB(g),E4(g,g.return);break;case 27:cB(g);case 26:case 5:V1(w,g,x),x&&v===null&&X&4&&yB(g),E4(g,g.return);break;case 12:if(x&&X&4){X=s1(),V1(w,g,x),x=g.stateNode,x.effectDuration+=A4(X);try{n(g,lB,g,v,d5,x.effectDuration)}catch(H){S0(g,g.return,H)}}else V1(w,g,x);break;case 31:V1(w,g,x),x&&X&4&&oB(w,g);break;case 13:V1(w,g,x),x&&X&4&&tB(w,g);break;case 22:g.memoizedState===null&&V1(w,g,x),E4(g,g.return);break;case 30:break;default:V1(w,g,x)}(g.mode&Y0)!==B0&&0<=G0&&0<=Z0&&(Xw||0.05<zw)&&K1(g,G0,Z0,zw,vw),L2(z),Y1(G),vw=Z,Xw=B}function V1(w,v,g){g=g&&(v.subtreeFlags&8772)!==0;for(v=v.child;v!==null;)vX(w,v.alternate,v,g),v=v.sibling}function o7(w,v){var g=null;w!==null&&w.memoizedState!==null&&w.memoizedState.cachePool!==null&&(g=w.memoizedState.cachePool.pool),w=null,v.memoizedState!==null&&v.memoizedState.cachePool!==null&&(w=v.memoizedState.cachePool.pool),w!==g&&(w!=null&&bv(w),g!=null&&j4(g))}function t7(w,v){w=null,v.alternate!==null&&(w=v.alternate.memoizedState.cache),v=v.memoizedState.cache,v!==w&&(bv(v),w!=null&&j4(w))}function w1(w,v,g,x,z){if(v.subtreeFlags&10256||v.actualDuration!==0&&(v.alternate===null||v.alternate.child!==v.child))for(v=v.child;v!==null;){var G=v.sibling;gX(w,v,g,x,G!==null?G.actualStartTime:z),v=G}}function gX(w,v,g,x,z){var G=Y2(),Z=M1(),B=L1(),X=I1(),H=f5,Y=v.flags;switch(v.tag){case 0:case 11:case 15:(v.mode&Y0)!==B0&&0<v.actualStartTime&&(v.flags&1)!==0&&Z3(v,v.actualStartTime,z,Rw,g),w1(w,v,g,x,z),Y&2048&&TB(v,tw|a2);break;case 1:(v.mode&Y0)!==B0&&0<v.actualStartTime&&((v.flags&128)!==0?f8(v,v.actualStartTime,z,[]):(v.flags&1)!==0&&Z3(v,v.actualStartTime,z,Rw,g)),w1(w,v,g,x,z);break;case 3:var L=s1(),U=Rw;Rw=v.alternate!==null&&v.alternate.memoizedState.isDehydrated&&(v.flags&256)===0,w1(w,v,g,x,z),Rw=U,Y&2048&&(g=null,v.alternate!==null&&(g=v.alternate.memoizedState.cache),x=v.memoizedState.cache,x!==g&&(bv(x),g!=null&&j4(g))),w.passiveEffectDuration+=K3(L);break;case 12:if(Y&2048){Y=s1(),w1(w,v,g,x,z),w=v.stateNode,w.passiveEffectDuration+=A4(Y);try{n(v,gU,v,v.alternate,d5,w.passiveEffectDuration)}catch(R){S0(v,v.return,R)}}else w1(w,v,g,x,z);break;case 31:Y=Rw,L=v.alternate!==null?v.alternate.memoizedState:null,U=v.memoizedState,L!==null&&U===null?(U=v.deletions,U!==null&&0<U.length&&U[0].tag===18?(Rw=!1,L=L.hydrationErrors,L!==null&&f8(v,v.actualStartTime,z,L)):Rw=!0):Rw=!1,w1(w,v,g,x,z),Rw=Y;break;case 13:Y=Rw,L=v.alternate!==null?v.alternate.memoizedState:null,U=v.memoizedState,L===null||L.dehydrated===null||U!==null&&U.dehydrated!==null?Rw=!1:(U=v.deletions,U!==null&&0<U.length&&U[0].tag===18?(Rw=!1,L=L.hydrationErrors,L!==null&&f8(v,v.actualStartTime,z,L)):Rw=!0),w1(w,v,g,x,z),Rw=Y;break;case 23:break;case 22:U=v.stateNode,L=v.alternate,v.memoizedState!==null?U._visibility&p1?w1(w,v,g,x,z):N4(w,v,g,x,z):U._visibility&p1?w1(w,v,g,x,z):(U._visibility|=p1,qg(w,v,g,x,(v.subtreeFlags&10256)!==0||v.actualDuration!==0&&(v.alternate===null||v.alternate.child!==v.child),z),(v.mode&Y0)===B0||Rw||(w=v.actualStartTime,0<=w&&0.05<z-w&&G3(v,w,z),0<=G0&&0<=Z0&&0.05<Z0-G0&&G3(v,G0,Z0))),Y&2048&&o7(L,v);break;case 24:w1(w,v,g,x,z),Y&2048&&t7(v.alternate,v);break;default:w1(w,v,g,x,z)}if((v.mode&Y0)!==B0){if(w=!Rw&&v.alternate===null&&v.return!==null&&v.return.alternate!==null)g=v.actualStartTime,0<=g&&0.05<z-g&&U1(v,g,z,"Mount");0<=G0&&0<=Z0&&((Xw||0.05<zw)&&K1(v,G0,Z0,zw,vw),w&&0.05<Z0-G0&&U1(v,G0,Z0,"Mount"))}L2(G),Y1(Z),vw=B,Xw=X,f5=H}function qg(w,v,g,x,z,G){z=z&&((v.subtreeFlags&10256)!==0||v.actualDuration!==0&&(v.alternate===null||v.alternate.child!==v.child));for(v=v.child;v!==null;){var Z=v.sibling;xX(w,v,g,x,z,Z!==null?Z.actualStartTime:G),v=Z}}function xX(w,v,g,x,z,G){var Z=Y2(),B=M1(),X=L1(),H=I1(),Y=f5;z&&(v.mode&Y0)!==B0&&0<v.actualStartTime&&(v.flags&1)!==0&&Z3(v,v.actualStartTime,G,Rw,g);var L=v.flags;switch(v.tag){case 0:case 11:case 15:qg(w,v,g,x,z,G),TB(v,tw);break;case 23:break;case 22:var U=v.stateNode;v.memoizedState!==null?U._visibility&p1?qg(w,v,g,x,z,G):N4(w,v,g,x,G):(U._visibility|=p1,qg(w,v,g,x,z,G)),z&&L&2048&&o7(v.alternate,v);break;case 24:qg(w,v,g,x,z,G),z&&L&2048&&t7(v.alternate,v);break;default:qg(w,v,g,x,z,G)}(v.mode&Y0)!==B0&&0<=G0&&0<=Z0&&(Xw||0.05<zw)&&K1(v,G0,Z0,zw,vw),L2(Z),Y1(B),vw=X,Xw=H,f5=Y}function N4(w,v,g,x,z){if(v.subtreeFlags&10256||v.actualDuration!==0&&(v.alternate===null||v.alternate.child!==v.child))for(var G=v.child;G!==null;){v=G.sibling;var Z=w,B=g,X=x,H=v!==null?v.actualStartTime:z,Y=f5;(G.mode&Y0)!==B0&&0<G.actualStartTime&&(G.flags&1)!==0&&Z3(G,G.actualStartTime,H,Rw,B);var L=G.flags;switch(G.tag){case 22:N4(Z,G,B,X,H),L&2048&&o7(G.alternate,G);break;case 24:N4(Z,G,B,X,H),L&2048&&t7(G.alternate,G);break;default:N4(Z,G,B,X,H)}f5=Y,G=v}}function Ug(w,v,g){if(w.subtreeFlags&Vx)for(w=w.child;w!==null;)zX(w,v,g),w=w.sibling}function zX(w,v,g){switch(w.tag){case 26:Ug(w,v,g),w.flags&Vx&&w.memoizedState!==null&&iU(g,Z1,w.memoizedState,w.memoizedProps);break;case 5:Ug(w,v,g);break;case 3:case 4:var x=Z1;Z1=t3(w.stateNode.containerInfo),Ug(w,v,g),Z1=x;break;case 22:w.memoizedState===null&&(x=w.alternate,x!==null&&x.memoizedState!==null?(x=Vx,Vx=16777216,Ug(w,v,g),Vx=x):Ug(w,v,g));break;default:Ug(w,v,g)}}function GX(w){var v=w.alternate;if(v!==null&&(w=v.child,w!==null)){v.child=null;do v=w.sibling,w.sibling=null,w=v;while(w!==null)}}function S4(w){var v=w.deletions;if((w.flags&16)!==0){if(v!==null)for(var g=0;g<v.length;g++){var x=v[g],z=Y2();hw=x,XX(x,w),(x.mode&Y0)!==B0&&0<=G0&&0<=Z0&&0.05<Z0-G0&&U1(x,G0,Z0,"Unmount"),L2(z)}GX(w)}if(w.subtreeFlags&10256)for(w=w.child;w!==null;)ZX(w),w=w.sibling}function ZX(w){var v=Y2(),g=M1(),x=L1(),z=I1();switch(w.tag){case 0:case 11:case 15:S4(w),w.flags&2048&&s7(w,w.return,tw|a2);break;case 3:var G=s1();S4(w),w.stateNode.passiveEffectDuration+=K3(G);break;case 12:G=s1(),S4(w),w.stateNode.passiveEffectDuration+=A4(G);break;case 22:G=w.stateNode,w.memoizedState!==null&&G._visibility&p1&&(w.return===null||w.return.tag!==13)?(G._visibility&=~p1,a3(w),(w.mode&Y0)!==B0&&0<=G0&&0<=Z0&&0.05<Z0-G0&&U1(w,G0,Z0,"Disconnect")):S4(w);break;default:S4(w)}(w.mode&Y0)!==B0&&0<=G0&&0<=Z0&&(Xw||0.05<zw)&&K1(w,G0,Z0,zw,vw),L2(v),Y1(g),Xw=z,vw=x}function a3(w){var v=w.deletions;if((w.flags&16)!==0){if(v!==null)for(var g=0;g<v.length;g++){var x=v[g],z=Y2();hw=x,XX(x,w),(x.mode&Y0)!==B0&&0<=G0&&0<=Z0&&0.05<Z0-G0&&U1(x,G0,Z0,"Unmount"),L2(z)}GX(w)}for(w=w.child;w!==null;)BX(w),w=w.sibling}function BX(w){var v=Y2(),g=M1(),x=L1(),z=I1();switch(w.tag){case 0:case 11:case 15:s7(w,w.return,tw),a3(w);break;case 22:var G=w.stateNode;G._visibility&p1&&(G._visibility&=~p1,a3(w));break;default:a3(w)}(w.mode&Y0)!==B0&&0<=G0&&0<=Z0&&(Xw||0.05<zw)&&K1(w,G0,Z0,zw,vw),L2(v),Y1(g),Xw=z,vw=x}function XX(w,v){for(;hw!==null;){var g=hw,x=g,z=v,G=Y2(),Z=M1(),B=L1(),X=I1();switch(x.tag){case 0:case 11:case 15:s7(x,z,tw);break;case 23:case 22:x.memoizedState!==null&&x.memoizedState.cachePool!==null&&(z=x.memoizedState.cachePool.pool,z!=null&&bv(z));break;case 24:j4(x.memoizedState.cache)}if((x.mode&Y0)!==B0&&0<=G0&&0<=Z0&&(Xw||0.05<zw)&&K1(x,G0,Z0,zw,vw),L2(G),Y1(Z),Xw=X,vw=B,x=g.child,x!==null)x.return=g,hw=x;else w:for(g=w;hw!==null;){if(x=hw,G=x.sibling,Z=x.return,rB(x),x===g){hw=null;break w}if(G!==null){G.return=Z,hw=G;break w}hw=Z}}}function ZU(){DW.forEach(function(w){return w()})}function HX(){var w=typeof IS_REACT_ACT_ENVIRONMENT<"u"?IS_REACT_ACT_ENVIRONMENT:void 0;return w||k.actQueue===null||console.error("The current testing environment is not configured to support act(...)"),w}function b2(w){if((P0&Vw)!==Pw&&I0!==0)return I0&-I0;var v=k.T;return v!==null?(v._updatedFibers||(v._updatedFibers=new Set),v._updatedFibers.add(w),G9()):I()}function JX(){if(Q2===0)if((I0&536870912)===0||D0){var w=H6;H6<<=1,(H6&3932160)===0&&(H6=262144),Q2=w}else Q2=536870912;return w=D2.current,w!==null&&(w.flags|=32),Q2}function Bw(w,v,g){if(eg&&console.error("useInsertionEffect must not schedule updates."),mz&&(r6=!0),w===a0&&(m0===uv||m0===lv)||w.cancelPendingCommit!==null)Wg(w,0),V5(w,I0,Q2,!1);if(U5(w,g),(P0&Vw)!==Pw&&w===a0){if(P1)switch(v.tag){case 0:case 11:case 15:w=j0&&l(j0)||"Unknown",SQ.has(w)||(SQ.add(w),v=l(v)||"Unknown",console.error("Cannot update a component (`%s`) while rendering a different component (`%s`). To locate the bad setState() call inside `%s`, follow the stack trace as described in https://react.dev/link/setstate-in-render",v,w,w));break;case 1:NQ||(console.error("Cannot update during an existing state transition (such as within `render`). Render methods should be a pure function of props and state."),NQ=!0)}}else _1&&Q4(w,v,g),WU(v),w===a0&&((P0&Vw)===Pw&&(i5|=g),Gw===a5&&V5(w,I0,Q2,!1)),D1(w)}function QX(w,v,g){if((P0&(Vw|F2))!==Pw)throw Error("Should not already be working.");if(I0!==0&&j0!==null){var x=j0,z=kw();switch(FJ){case Fx:case uv:var G=$x;t0&&((x=x._debugTask)?x.run(console.timeStamp.bind(console,"Suspended",G,z,N2,void 0,"primary-light")):console.timeStamp("Suspended",G,z,N2,void 0,"primary-light"));break;case lv:G=$x,t0&&((x=x._debugTask)?x.run(console.timeStamp.bind(console,"Action",G,z,N2,void 0,"primary-light")):console.timeStamp("Action",G,z,N2,void 0,"primary-light"));break;default:t0&&(x=z-$x,3>x||console.timeStamp("Blocked",$x,z,N2,void 0,5>x?"primary-light":10>x?"primary":100>x?"primary-dark":"error"))}}G=(g=!g&&(v&127)===0&&(v&w.expiredLanes)===0||Xv(w,v))?XU(w,v):e7(w,v,!0);var Z=g;do{if(G===H5){tg&&!g&&V5(w,v,0,!1),v=m0,$x=Mw(),FJ=v;break}else{if(x=kw(),z=w.current.alternate,Z&&!BU(z)){W2(v),z=Fw,G=x,!t0||G<=z||(Qw?Qw.run(console.timeStamp.bind(console,"Teared Render",z,G,V0,R0,"error")):console.timeStamp("Teared Render",z,G,V0,R0,"error")),Dv(v,x),G=e7(w,v,!1),Z=!1;continue}if(G===mv){if(Z=v,w.errorRecoveryDisabledLanes&Z)var B=0;else B=w.pendingLanes&-536870913,B=B!==0?B:B&536870912?536870912:0;if(B!==0){W2(v),E8(Fw,x,v,Qw),Dv(v,x),v=B;w:{x=w,G=Z,Z=Px;var X=x.current.memoizedState.isDehydrated;if(X&&(Wg(x,B).flags|=256),B=e7(x,B,!1),B!==mv){if(Cz&&!X){x.errorRecoveryDisabledLanes|=G,i5|=G,G=a5;break w}x=pw,pw=Z,x!==null&&(pw===null?pw=x:pw.push.apply(pw,x))}G=B}if(Z=!1,G!==mv)continue;else x=kw()}}if(G===kx){W2(v),E8(Fw,x,v,Qw),Dv(v,x),Wg(w,0),V5(w,v,0,!0);break}w:{switch(g=w,G){case H5:case kx:throw Error("Root did not complete. This is a bug in React.");case a5:if((v&4194048)!==v)break;case m6:W2(v),QZ(Fw,x,v,Qw),Dv(v,x),z=v,(z&127)!==0?R6=x:(z&4194048)!==0&&(V6=x),V5(g,v,Q2,!c5);break w;case mv:pw=null;break;case T6:case AQ:break;default:throw Error("Unknown root exit status.")}if(k.actQueue!==null)w9(g,z,v,pw,Cx,y6,Q2,i5,yv,G,null,null,Fw,x);else{if((v&62914560)===v&&(Z=a6+VQ-kw(),10<Z)){if(V5(g,v,Q2,!c5),Bv(g,0,!0)!==0)break w;B1=v,g.timeoutHandle=cQ($X.bind(null,g,z,pw,Cx,y6,v,Q2,i5,yv,c5,G,"Throttled",Fw,x),Z);break w}$X(g,z,pw,Cx,y6,v,Q2,i5,yv,c5,G,null,Fw,x)}}}break}while(1);D1(w)}function $X(w,v,g,x,z,G,Z,B,X,H,Y,L,U,R){w.timeoutHandle=rv;var u=v.subtreeFlags,i=null;if(u&8192||(u&16785408)===16785408){if(i={stylesheets:null,count:0,imgCount:0,imgBytes:0,suspenseyImages:[],waitingForImages:!0,waitingForViewTransition:!1,unsuspend:l1},zX(v,G,i),u=(G&62914560)===G?a6-kw():(G&4194048)===G?RQ-kw():0,u=rU(i,u),u!==null){B1=G,w.cancelPendingCommit=u(w9.bind(null,w,v,G,g,x,z,Z,B,X,Y,i,i.waitingForViewTransition?"Waiting for the previous Animation":0<i.count?0<i.imgCount?"Suspended on CSS and Images":"Suspended on CSS":i.imgCount===1?"Suspended on an Image":0<i.imgCount?"Suspended on Images":null,U,R)),V5(w,G,Z,!H);return}}w9(w,v,G,g,x,z,Z,B,X,Y,i,L,U,R)}function BU(w){for(var v=w;;){var g=v.tag;if((g===0||g===11||g===15)&&v.flags&16384&&(g=v.updateQueue,g!==null&&(g=g.stores,g!==null)))for(var x=0;x<g.length;x++){var z=g[x],G=z.getSnapshot;z=z.value;try{if(!rw(G(),z))return!1}catch(Z){return!1}}if(g=v.child,v.subtreeFlags&16384&&g!==null)g.return=v,v=g;else{if(v===w)break;for(;v.sibling===null;){if(v.return===null||v.return===w)return!0;v=v.return}v.sibling.return=v.return,v=v.sibling}}return!0}function V5(w,v,g,x){v&=~_z,v&=~i5,w.suspendedLanes|=v,w.pingedLanes&=~v,x&&(w.warmLanes|=v),x=w.expirationTimes;for(var z=v;0<z;){var G=31-cw(z),Z=1<<G;x[G]=-1,z&=~Z}g!==0&&Hv(w,g,v)}function Kg(){return(P0&(Vw|F2))===Pw?(m4(0,!1),!1):!0}function p7(){if(j0!==null){if(m0===J2)var w=j0.return;else w=j0,$3(),H7(w),lg=null,bx=0,w=j0;for(;w!==null;)SB(w.alternate,w),w=w.return;j0=null}}function Dv(w,v){(w&127)!==0&&(T5=v),(w&4194048)!==0&&(d1=v),(w&62914560)!==0&&(DJ=v),(w&2080374784)!==0&&(kJ=v)}function Wg(w,v){t0&&(console.timeStamp("Blocking Track",0.003,0.003,"Blocking",R0,"primary-light"),console.timeStamp("Transition Track",0.003,0.003,"Transition",R0,"primary-light"),console.timeStamp("Suspense Track",0.003,0.003,"Suspense",R0,"primary-light"),console.timeStamp("Idle Track",0.003,0.003,"Idle",R0,"primary-light"));var g=Fw;if(Fw=Mw(),I0!==0&&0<g){if(W2(I0),Gw===T6||Gw===a5)QZ(g,Fw,v,Qw);else{var x=Fw,z=Qw;if(t0&&!(x<=g)){var G=(v&738197653)===v?"tertiary-dark":"primary-dark",Z=(v&536870912)===v?"Prewarm":(v&201326741)===v?"Interrupted Hydration":"Interrupted Render";z?z.run(console.timeStamp.bind(console,Z,g,x,V0,R0,G)):console.timeStamp(Z,g,x,V0,R0,G)}}Dv(I0,Fw)}if(g=Qw,Qw=null,(v&127)!==0){Qw=Hx,z=0<=S1&&S1<T5?T5:S1,x=0<=Cv&&Cv<T5?T5:Cv,G=0<=x?x:0<=z?z:Fw,0<=R6?(W2(2),$Z(R6,G,v,g)):(D6&127)!==0&&(W2(2),I4(T5,G,z5)),g=z;var B=x,X=Jx,H=0<Tg,Y=m5===Xx,L=m5===O6;if(z=Fw,x=Hx,G=Qz,Z=$z,t0){if(V0="Blocking",0<g?g>z&&(g=z):g=z,0<B?B>g&&(B=g):B=g,X!==null&&g>B){var U=H?"secondary-light":"warning";x?x.run(console.timeStamp.bind(console,H?"Consecutive":"Event: "+X,B,g,V0,R0,U)):console.timeStamp(H?"Consecutive":"Event: "+X,B,g,V0,R0,U)}z>g&&(B=Y?"error":(v&738197653)===v?"tertiary-light":"primary-light",Y=L?"Promise Resolved":Y?"Cascading Update":5<z-g?"Update Blocked":"Update",L=[],Z!=null&&L.push(["Component name",Z]),G!=null&&L.push(["Method name",G]),g={start:g,end:z,detail:{devtools:{properties:L,track:V0,trackGroup:R0,color:B}}},x?x.run(performance.measure.bind(performance,Y,g)):performance.measure(Y,g))}S1=-1.1,m5=0,$z=Qz=null,R6=-1.1,Tg=Cv,Cv=-1.1,T5=Mw()}if((v&4194048)!==0&&(Qw=Qx,z=0<=x5&&x5<d1?d1:x5,g=0<=l2&&l2<d1?d1:l2,x=0<=u5&&u5<d1?d1:u5,G=0<=x?x:0<=g?g:Fw,0<=V6?(W2(256),$Z(V6,G,v,Qw)):(D6&4194048)!==0&&(W2(256),I4(d1,G,z5)),L=x,B=_v,X=0<l5,H=qz===O6,G=Fw,x=Qx,Z=RJ,Y=VJ,t0&&(V0="Transition",0<g?g>G&&(g=G):g=G,0<z?z>g&&(z=g):z=g,0<L?L>z&&(L=z):L=z,z>L&&B!==null&&(U=X?"secondary-light":"warning",x?x.run(console.timeStamp.bind(console,X?"Consecutive":"Event: "+B,L,z,V0,R0,U)):console.timeStamp(X?"Consecutive":"Event: "+B,L,z,V0,R0,U)),g>z&&(x?x.run(console.timeStamp.bind(console,"Action",z,g,V0,R0,"primary-dark")):console.timeStamp("Action",z,g,V0,R0,"primary-dark")),G>g&&(z=H?"Promise Resolved":5<G-g?"Update Blocked":"Update",L=[],Y!=null&&L.push(["Component name",Y]),Z!=null&&L.push(["Method name",Z]),g={start:g,end:G,detail:{devtools:{properties:L,track:V0,trackGroup:R0,color:"primary-light"}}},x?x.run(performance.measure.bind(performance,z,g)):performance.measure(z,g))),l2=x5=-1.1,qz=0,V6=-1.1,l5=u5,u5=-1.1,d1=Mw()),(v&62914560)!==0&&(D6&62914560)!==0&&(W2(4194304),I4(DJ,Fw,z5)),(v&2080374784)!==0&&(D6&2080374784)!==0&&(W2(268435456),I4(kJ,Fw,z5)),g=w.timeoutHandle,g!==rv&&(w.timeoutHandle=rv,mW(g)),g=w.cancelPendingCommit,g!==null&&(w.cancelPendingCommit=null,g()),B1=0,p7(),a0=w,j0=g=y1(w.current,null),I0=v,m0=J2,h2=null,c5=!1,tg=Xv(w,v),Cz=!1,Gw=H5,yv=Q2=_z=i5=s5=0,pw=Px=null,y6=!1,(v&8)!==0&&(v|=v&32),x=w.entangledLanes,x!==0)for(w=w.entanglements,x&=v;0<x;)z=31-cw(x),G=1<<z,v|=w[z],x&=~G;return m1=v,B3(),w=LJ(),1000<w-YJ&&(k.recentlyCreatedOwnerStacks=0,YJ=w),z1.discardPendingWarnings(),g}function qX(w,v){H0=null,k.H=Rx,k.getCurrentStack=null,P1=!1,O2=null,v===ug||v===P6?(v=fZ(),m0=Fx):v===Mz?(v=fZ(),m0=OQ):m0=v===Dz?Pz:v!==null&&typeof v==="object"&&typeof v.then==="function"?hx:u6,h2=v;var g=j0;g===null?(Gw=kx,S3(w,M2(v,w.current))):g.mode&Y0&&o8(g)}function UX(){var w=D2.current;return w===null?!0:(I0&4194048)===I0?y2===null?!0:!1:(I0&62914560)===I0||(I0&536870912)!==0?w===y2:!1}function KX(){var w=k.H;return k.H=Rx,w===null?Rx:w}function WX(){var w=k.A;return k.A=VW,w}function c3(w){Qw===null&&(Qw=w._debugTask==null?null:w._debugTask)}function s3(){Gw=a5,c5||(I0&4194048)!==I0&&D2.current!==null||(tg=!0),(s5&134217727)===0&&(i5&134217727)===0||a0===null||V5(a0,I0,Q2,!1)}function e7(w,v,g){var x=P0;P0|=Vw;var z=KX(),G=WX();if(a0!==w||I0!==v){if(_1){var Z=w.memoizedUpdaters;0<Z.size&&(T4(w,I0),Z.clear()),K5(w,v)}Cx=null,Wg(w,v)}v=!1,Z=Gw;w:do try{if(m0!==J2&&j0!==null){var B=j0,X=h2;switch(m0){case Pz:p7(),Z=m6;break w;case Fx:case uv:case lv:case hx:D2.current===null&&(v=!0);var H=m0;if(m0=J2,h2=null,Mg(w,B,X,H),g&&tg){Z=H5;break w}break;default:H=m0,m0=J2,h2=null,Mg(w,B,X,H)}}MX(),Z=Gw;break}catch(Y){qX(w,Y)}while(1);return v&&w.shellSuspendCounter++,$3(),P0=x,k.H=z,k.A=G,j0===null&&(a0=null,I0=0,B3()),Z}function MX(){for(;j0!==null;)YX(j0)}function XU(w,v){var g=P0;P0|=Vw;var x=KX(),z=WX();if(a0!==w||I0!==v){if(_1){var G=w.memoizedUpdaters;0<G.size&&(T4(w,I0),G.clear()),K5(w,v)}Cx=null,c6=kw()+DQ,Wg(w,v)}else tg=Xv(w,v);w:do try{if(m0!==J2&&j0!==null)v:switch(v=j0,G=h2,m0){case u6:m0=J2,h2=null,Mg(w,v,G,u6);break;case uv:case lv:if(CZ(G)){m0=J2,h2=null,LX(v);break}v=function(){m0!==uv&&m0!==lv||a0!==w||(m0=l6),D1(w)},G.then(v,v);break w;case Fx:m0=l6;break w;case OQ:m0=hz;break w;case l6:CZ(G)?(m0=J2,h2=null,LX(v)):(m0=J2,h2=null,Mg(w,v,G,l6));break;case hz:var Z=null;switch(j0.tag){case 26:Z=j0.memoizedState;case 5:case 27:var B=j0;if(Z?QH(Z):B.stateNode.complete){m0=J2,h2=null;var X=B.sibling;if(X!==null)j0=X;else{var H=B.return;H!==null?(j0=H,i3(H)):j0=null}break v}break;default:console.error("Unexpected type of fiber triggered a suspensey commit. This is a bug in React.")}m0=J2,h2=null,Mg(w,v,G,hz);break;case hx:m0=J2,h2=null,Mg(w,v,G,hx);break;case Pz:p7(),Gw=m6;break w;default:throw Error("Unexpected SuspendedReason. This is a bug in React.")}k.actQueue!==null?MX():HU();break}catch(Y){qX(w,Y)}while(1);if($3(),k.H=x,k.A=z,P0=g,j0!==null)return H5;return a0=null,I0=0,B3(),Gw}function HU(){for(;j0!==null&&!BK();)YX(j0)}function YX(w){var v=w.alternate;(w.mode&Y0)!==B0?(n8(w),v=n(w,y7,v,w,m1),o8(w)):v=n(w,y7,v,w,m1),w.memoizedProps=w.pendingProps,v===null?i3(w):j0=v}function LX(w){var v=n(w,JU,w);w.memoizedProps=w.pendingProps,v===null?i3(w):j0=v}function JU(w){var v=w.alternate,g=(w.mode&Y0)!==B0;switch(g&&n8(w),w.tag){case 15:case 0:v=hB(v,w,w.pendingProps,w.type,void 0,I0);break;case 11:v=hB(v,w,w.pendingProps,w.type.render,w.ref,I0);break;case 5:H7(w);default:SB(v,w),w=j0=YZ(w,m1),v=y7(v,w,m1)}return g&&o8(w),v}function Mg(w,v,g,x){$3(),H7(v),lg=null,bx=0;var z=v.return;try{if(rq(w,z,v,g,I0)){Gw=kx,S3(w,M2(g,w.current)),j0=null;return}}catch(G){if(z!==null)throw j0=z,G;Gw=kx,S3(w,M2(g,w.current)),j0=null;return}if(v.flags&32768){if(D0||x===u6)w=!0;else if(tg||(I0&536870912)!==0)w=!1;else if(c5=w=!0,x===uv||x===lv||x===Fx||x===hx)x=D2.current,x!==null&&x.tag===13&&(x.flags|=16384);IX(v,w)}else i3(v)}function i3(w){var v=w;do{if((v.flags&32768)!==0){IX(v,c5);return}var g=v.alternate;if(w=v.return,n8(v),g=n(v,tq,g,v,m1),(v.mode&Y0)!==B0&&DZ(v),g!==null){j0=g;return}if(v=v.sibling,v!==null){j0=v;return}j0=v=w}while(v!==null);Gw===H5&&(Gw=AQ)}function IX(w,v){do{var g=pq(w.alternate,w);if(g!==null){g.flags&=32767,j0=g;return}if((w.mode&Y0)!==B0){DZ(w),g=w.actualDuration;for(var x=w.child;x!==null;)g+=x.actualDuration,x=x.sibling;w.actualDuration=g}if(g=w.return,g!==null&&(g.flags|=32768,g.subtreeFlags=0,g.deletions=null),!v&&(w=w.sibling,w!==null)){j0=w;return}j0=w=g}while(w!==null);Gw=m6,j0=null}function w9(w,v,g,x,z,G,Z,B,X,H,Y,L,U,R){w.cancelPendingCommit=null;do d4();while(jw!==n5);if(z1.flushLegacyContextWarning(),z1.flushPendingUnsafeLifecycleWarnings(),(P0&(Vw|F2))!==Pw)throw Error("Should not already be working.");if(W2(g),H===mv?E8(U,R,g,Qw):x!==null?Eq(U,R,g,x,v!==null&&v.alternate!==null&&v.alternate.memoizedState.isDehydrated&&(v.flags&256)!==0,Qw):fq(U,R,g,Qw),v!==null){if(g===0&&console.error("finishedLanes should not be empty during a commit. This is a bug in React."),v===w.current)throw Error("Cannot commit the same tree as before. This error is likely caused by a bug in React. Please file an issue.");if(G=v.lanes|v.childLanes,G|=Zz,ox(w,g,G,Z,B,X),w===a0&&(j0=a0=null,I0=0),pg=v,o5=w,B1=g,Nz=G,dz=z,_Q=x,Sz=R,fQ=L,X1=s6,EQ=null,v.actualDuration!==0||(v.subtreeFlags&10256)!==0||(v.flags&10256)!==0?(w.callbackNode=null,w.callbackPriority=0,KU(Ag,function(){return dx=window.event,X1===s6&&(X1=Ez),RX(),null})):(w.callbackNode=null,w.callbackPriority=0),g5=null,d5=Mw(),L!==null&&Nq(R,d5,L,Qw),x=(v.flags&13878)!==0,(v.subtreeFlags&13878)!==0||x){x=k.T,k.T=null,z=d0.p,d0.p=R2,Z=P0,P0|=F2;try{zU(w,v,g)}finally{P0=Z,d0.p=z,k.T=x}}jw=FQ,bX(),jX(),AX()}}function bX(){if(jw===FQ){jw=n5;var w=o5,v=pg,g=B1,x=(v.flags&13878)!==0;if((v.subtreeFlags&13878)!==0||x){x=k.T,k.T=null;var z=d0.p;d0.p=R2;var G=P0;P0|=F2;try{ng=g,og=w,W3(),pB(v,w),og=ng=null,g=nz;var Z=XZ(w.containerInfo),B=g.focusedElem,X=g.selectionRange;if(Z!==B&&B&&B.ownerDocument&&BZ(B.ownerDocument.documentElement,B)){if(X!==null&&C8(B)){var{start:H,end:Y}=X;if(Y===void 0&&(Y=H),"selectionStart"in B)B.selectionStart=H,B.selectionEnd=Math.min(Y,B.value.length);else{var L=B.ownerDocument||document,U=L&&L.defaultView||window;if(U.getSelection){var R=U.getSelection(),u=B.textContent.length,i=Math.min(X.start,u),n0=X.end===void 0?i:Math.min(X.end,u);!R.extend&&i>n0&&(Z=n0,n0=i,i=Z);var h0=ZZ(B,i),q=ZZ(B,n0);if(h0&&q&&(R.rangeCount!==1||R.anchorNode!==h0.node||R.anchorOffset!==h0.offset||R.focusNode!==q.node||R.focusOffset!==q.offset)){var K=L.createRange();K.setStart(h0.node,h0.offset),R.removeAllRanges(),i>n0?(R.addRange(K),R.extend(q.node,q.offset)):(K.setEnd(q.node,q.offset),R.addRange(K))}}}}L=[];for(R=B;R=R.parentNode;)R.nodeType===1&&L.push({element:R,left:R.scrollLeft,top:R.scrollTop});typeof B.focus==="function"&&B.focus();for(B=0;B<L.length;B++){var W=L[B];W.element.scrollLeft=W.left,W.element.scrollTop=W.top}}X8=!!rz,nz=rz=null}finally{P0=G,d0.p=z,k.T=x}}w.current=v,jw=hQ}}function jX(){if(jw===hQ){jw=n5;var w=EQ;if(w!==null){d5=Mw();var v=v5,g=d5;!t0||g<=v||(z5?z5.run(console.timeStamp.bind(console,w,v,g,V0,R0,"secondary-light")):console.timeStamp(w,v,g,V0,R0,"secondary-light"))}w=o5,v=pg,g=B1;var x=(v.flags&8772)!==0;if((v.subtreeFlags&8772)!==0||x){x=k.T,k.T=null;var z=d0.p;d0.p=R2;var G=P0;P0|=F2;try{ng=g,og=w,W3(),iB(w,v.alternate,v),og=ng=null}finally{P0=G,d0.p=z,k.T=x}}w=Sz,v=fQ,v5=Mw(),w=v===null?w:d5,v=v5,g=X1===fz,x=Qw,g5!==null?qZ(w,v,g5,!1,x):!t0||v<=w||(x?x.run(console.timeStamp.bind(console,g?"Commit Interrupted View Transition":"Commit",w,v,V0,R0,g?"error":"secondary-dark")):console.timeStamp(g?"Commit Interrupted View Transition":"Commit",w,v,V0,R0,g?"error":"secondary-dark")),jw=PQ}}function AX(){if(jw===CQ||jw===PQ){if(jw===CQ){var w=v5;v5=Mw();var v=v5,g=X1===fz;!t0||v<=w||(z5?z5.run(console.timeStamp.bind(console,g?"Interrupted View Transition":"Starting Animation",w,v,V0,R0,g?"error":"secondary-light")):console.timeStamp(g?"Interrupted View Transition":"Starting Animation",w,v,V0,R0,g?" error":"secondary-light")),X1!==fz&&(X1=kQ)}jw=n5,XK(),w=o5;var x=pg;v=B1,g=_Q;var z=x.actualDuration!==0||(x.subtreeFlags&10256)!==0||(x.flags&10256)!==0;z?jw=i6:(jw=n5,pg=o5=null,OX(w,w.pendingLanes),av=0,fx=null);var G=w.pendingLanes;if(G===0&&(r5=null),z||FX(w),G=J(v),x=x.stateNode,mw&&typeof mw.onCommitFiberRoot==="function")try{var Z=(x.current.flags&128)===128;switch(G){case R2:var B=d9;break;case g1:B=T9;break;case f1:B=Ag;break;case Q6:B=m9;break;default:B=Ag}mw.onCommitFiberRoot(Og,x,B,Z)}catch(L){C1||(C1=!0,console.error("React instrumentation encountered an error: %o",L))}if(_1&&w.memoizedUpdaters.clear(),ZU(),g!==null){Z=k.T,B=d0.p,d0.p=R2,k.T=null;try{var X=w.onRecoverableError;for(x=0;x<g.length;x++){var H=g[x],Y=QU(H.stack);n(H.source,X,H.value,Y)}}finally{k.T=Z,d0.p=B}}(B1&3)!==0&&d4(),D1(w),G=w.pendingLanes,(v&261930)!==0&&(G&42)!==0?(F6=!0,w===Tz?_x++:(_x=0,Tz=w)):_x=0,z||Dv(v,v5),m4(0,!1)}}function QU(w){return w={componentStack:w},Object.defineProperty(w,"digest",{get:function(){console.error('You are accessing "digest" from the errorInfo object passed to onRecoverableError. This property is no longer provided as part of errorInfo but can be accessed as a property of the Error instance itself.')}}),w}function OX(w,v){(w.pooledCacheLanes&=v)===0&&(v=w.pooledCache,v!=null&&(w.pooledCache=null,j4(v)))}function d4(){return bX(),jX(),AX(),RX()}function RX(){if(jw!==i6)return!1;var w=o5,v=Nz;Nz=0;var g=J(B1),x=f1===0||f1>g?f1:g;g=k.T;var z=d0.p;try{d0.p=x,k.T=null;var G=dz;dz=null,x=o5;var Z=B1;if(jw=n5,pg=o5=null,B1=0,(P0&(Vw|F2))!==Pw)throw Error("Cannot flush passive effects while already rendering.");W2(Z),mz=!0,r6=!1;var B=0;if(g5=null,B=kw(),X1===kQ)I4(v5,B,z5);else{var X=v5,H=B,Y=X1===Ez;!t0||H<=X||(Qw?Qw.run(console.timeStamp.bind(console,Y?"Waiting for Paint":"Waiting",X,H,V0,R0,"secondary-light")):console.timeStamp(Y?"Waiting for Paint":"Waiting",X,H,V0,R0,"secondary-light"))}X=P0,P0|=F2;var L=x.current;W3(),ZX(L);var U=x.current;L=Sz,W3(),gX(x,U,Z,G,L),FX(x),P0=X;var R=kw();if(U=B,L=Qw,g5!==null?qZ(U,R,g5,!0,L):!t0||R<=U||(L?L.run(console.timeStamp.bind(console,"Remaining Effects",U,R,V0,R0,"secondary-dark")):console.timeStamp("Remaining Effects",U,R,V0,R0,"secondary-dark")),Dv(Z,R),m4(0,!1),r6?x===fx?av++:(av=0,fx=x):av=0,r6=mz=!1,mw&&typeof mw.onPostCommitFiberRoot==="function")try{mw.onPostCommitFiberRoot(Og,x)}catch(i){C1||(C1=!0,console.error("React instrumentation encountered an error: %o",i))}var u=x.current.stateNode;return u.effectDuration=0,u.passiveEffectDuration=0,!0}finally{d0.p=z,k.T=g,OX(w,v)}}function VX(w,v,g){v=M2(g,v),kZ(v),v=C7(w.stateNode,v,2),w=j5(w,v,2),w!==null&&(U5(w,2),D1(w))}function S0(w,v,g){if(eg=!1,w.tag===3)VX(w,w,g);else{for(;v!==null;){if(v.tag===3){VX(v,w,g);return}if(v.tag===1){var x=v.stateNode;if(typeof v.type.getDerivedStateFromError==="function"||typeof x.componentDidCatch==="function"&&(r5===null||!r5.has(x))){w=M2(g,w),kZ(w),g=_7(2),x=j5(v,g,2),x!==null&&(f7(g,x,v,w),U5(x,2),D1(x));return}}v=v.return}console.error(`Internal React error: Attempted to capture a commit phase error inside a detached tree. This indicates a bug in React. Potential causes include deleting the same fiber more than once, committing an already-finished tree, or an inconsistent return pointer.

Error message:

%s`,g)}}function v9(w,v,g){var x=w.pingCache;if(x===null){x=w.pingCache=new kW;var z=new Set;x.set(v,z)}else z=x.get(v),z===void 0&&(z=new Set,x.set(v,z));z.has(g)||(Cz=!0,z.add(g),x=$U.bind(null,w,v,g),_1&&T4(w,g),v.then(x,x))}function $U(w,v,g){var x=w.pingCache;x!==null&&x.delete(v),w.pingedLanes|=w.suspendedLanes&g,w.warmLanes&=~g,(g&127)!==0?0>S1&&(T5=S1=Mw(),Hx=A6("Promise Resolved"),m5=O6):(g&4194048)!==0&&0>l2&&(d1=l2=Mw(),Qx=A6("Promise Resolved"),qz=O6),HX()&&k.actQueue===null&&console.error(`A suspended resource finished loading inside a test, but the event was not wrapped in act(...).

When testing, code that resolves suspended data should be wrapped into act(...):

act(() => {
  /* finish loading suspended data */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act`),a0===w&&(I0&g)===g&&(Gw===a5||Gw===T6&&(I0&62914560)===I0&&kw()-a6<VQ?(P0&Vw)===Pw&&Wg(w,0):_z|=g,yv===I0&&(yv=0)),D1(w)}function DX(w,v){v===0&&(v=vg()),w=Tw(w,v),w!==null&&(U5(w,v),D1(w))}function qU(w){var v=w.memoizedState,g=0;v!==null&&(g=v.retryLane),DX(w,g)}function UU(w,v){var g=0;switch(w.tag){case 31:case 13:var{stateNode:x,memoizedState:z}=w;z!==null&&(g=z.retryLane);break;case 19:x=w.stateNode;break;case 22:x=w.stateNode._retryCache;break;default:throw Error("Pinged unknown suspense boundary type. This is probably a bug in React.")}x!==null&&x.delete(v),DX(w,g)}function g9(w,v,g){if((v.subtreeFlags&67117056)!==0)for(v=v.child;v!==null;){var x=w,z=v,G=z.type===G6;G=g||G,z.tag!==22?z.flags&67108864?G&&n(z,kX,x,z):g9(x,z,G):z.memoizedState===null&&(G&&z.flags&8192?n(z,kX,x,z):z.subtreeFlags&67108864&&n(z,g9,x,z,G)),v=v.sibling}}function kX(w,v){i0(!0);try{wX(v),BX(v),vX(w,v.alternate,v,!1),xX(w,v,0,null,!1,0)}finally{i0(!1)}}function FX(w){var v=!0;w.current.mode&(uw|x1)||(v=!1),g9(w,w.current,v)}function hX(w){if((P0&Vw)===Pw){var v=w.tag;if(v===3||v===1||v===0||v===11||v===14||v===15){if(v=l(w)||"ReactComponent",n6!==null){if(n6.has(v))return;n6.add(v)}else n6=new Set([v]);n(w,function(){console.error("Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update the component. Move this work to useEffect instead.")})}}}function T4(w,v){_1&&w.memoizedUpdaters.forEach(function(g){Q4(w,g,v)})}function KU(w,v){var g=k.actQueue;return g!==null?(g.push(v),PW):S9(w,v)}function WU(w){HX()&&k.actQueue===null&&n(w,function(){console.error(`An update to %s inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act`,l(w))})}function D1(w){w!==w4&&w.next===null&&(w4===null?o6=w4=w:w4=w4.next=w),t6=!0,k.actQueue!==null?lz||(lz=!0,fX()):uz||(uz=!0,fX())}function m4(w,v){if(!yz&&t6){yz=!0;do{var g=!1;for(var x=o6;x!==null;){if(!v)if(w!==0){var z=x.pendingLanes;if(z===0)var G=0;else{var{suspendedLanes:Z,pingedLanes:B}=x;G=(1<<31-cw(42|w)+1)-1,G&=z&~(Z&~B),G=G&201326741?G&201326741|1:G?G|2:0}G!==0&&(g=!0,_X(x,G))}else G=I0,G=Bv(x,x===a0?G:0,x.cancelPendingCommit!==null||x.timeoutHandle!==rv),(G&3)===0||Xv(x,G)||(g=!0,_X(x,G));x=x.next}}while(g);yz=!1}}function MU(){dx=window.event,x9()}function x9(){t6=lz=uz=!1;var w=0;t5!==0&&OU()&&(w=t5);for(var v=kw(),g=null,x=o6;x!==null;){var z=x.next,G=PX(x,v);if(G===0)x.next=null,g===null?o6=z:g.next=z,z===null&&(w4=g);else if(g=x,w!==0||(G&3)!==0)t6=!0;x=z}jw!==n5&&jw!==i6||m4(w,!1),t5!==0&&(t5=0)}function PX(w,v){for(var{suspendedLanes:g,pingedLanes:x,expirationTimes:z}=w,G=w.pendingLanes&-62914561;0<G;){var Z=31-cw(G),B=1<<Z,X=z[Z];if(X===-1){if((B&g)===0||(B&x)!==0)z[Z]=b8(B,v)}else X<=v&&(w.expiredLanes|=B);G&=~B}if(v=a0,g=I0,g=Bv(w,w===v?g:0,w.cancelPendingCommit!==null||w.timeoutHandle!==rv),x=w.callbackNode,g===0||w===v&&(m0===uv||m0===lv)||w.cancelPendingCommit!==null)return x!==null&&z9(x),w.callbackNode=null,w.callbackPriority=0;if((g&3)===0||Xv(w,g)){if(v=g&-g,v!==w.callbackPriority||k.actQueue!==null&&x!==az)z9(x);else return v;switch(J(g)){case R2:case g1:g=T9;break;case f1:g=Ag;break;case Q6:g=m9;break;default:g=Ag}return x=CX.bind(null,w),k.actQueue!==null?(k.actQueue.push(x),g=az):g=S9(g,x),w.callbackPriority=v,w.callbackNode=g,v}return x!==null&&z9(x),w.callbackPriority=2,w.callbackNode=null,2}function CX(w,v){if(F6=k6=!1,dx=window.event,jw!==n5&&jw!==i6)return w.callbackNode=null,w.callbackPriority=0,null;var g=w.callbackNode;if(X1===s6&&(X1=Ez),d4()&&w.callbackNode!==g)return null;var x=I0;if(x=Bv(w,w===a0?x:0,w.cancelPendingCommit!==null||w.timeoutHandle!==rv),x===0)return null;return QX(w,x,v),PX(w,kw()),w.callbackNode!=null&&w.callbackNode===g?CX.bind(null,w):null}function _X(w,v){if(d4())return null;k6=F6,F6=!1,QX(w,v,!0)}function z9(w){w!==az&&w!==null&&ZK(w)}function fX(){k.actQueue!==null&&k.actQueue.push(function(){return x9(),null}),uW(function(){(P0&(Vw|F2))!==Pw?S9(d9,MU):x9()})}function G9(){if(t5===0){var w=fv;w===0&&(w=X6,X6<<=1,(X6&261888)===0&&(X6=256)),t5=w}return t5}function EX(w){if(w==null||typeof w==="symbol"||typeof w==="boolean")return null;if(typeof w==="function")return w;return u0(w,"action"),M4(""+w)}function NX(w,v){var g=v.ownerDocument.createElement("input");return g.name=v.name,g.value=v.value,w.id&&g.setAttribute("form",w.id),v.parentNode.insertBefore(g,v),w=new FormData(w),g.parentNode.removeChild(g),w}function YU(w,v,g,x,z){if(v==="submit"&&g&&g.stateNode===z){var G=EX((z[sw]||null).action),Z=x.submitter;Z&&(v=(v=Z[sw]||null)?EX(v.formAction):Z.getAttribute("formAction"),v!==null&&(G=v,Z=null));var B=new W6("action","action",null,x,z);w.push({event:B,listeners:[{instance:null,listener:function(){if(x.defaultPrevented){if(t5!==0){var X=Z?NX(z,Z):new FormData(z),H={pending:!0,data:X,method:z.method,action:G};Object.freeze(H),R7(g,H,null,X)}}else typeof G==="function"&&(B.preventDefault(),X=Z?NX(z,Z):new FormData(z),H={pending:!0,data:X,method:z.method,action:G},Object.freeze(H),R7(g,H,G,X))},currentTarget:z}]})}}function r3(w,v,g){w.currentTarget=g;try{v(w)}catch(x){gz(x)}w.currentTarget=null}function SX(w,v){v=(v&4)!==0;for(var g=0;g<w.length;g++){var x=w[g];w:{var z=void 0,G=x.event;if(x=x.listeners,v)for(var Z=x.length-1;0<=Z;Z--){var B=x[Z],X=B.instance,H=B.currentTarget;if(B=B.listener,X!==z&&G.isPropagationStopped())break w;X!==null?n(X,r3,G,B,H):r3(G,B,H),z=X}else for(Z=0;Z<x.length;Z++){if(B=x[Z],X=B.instance,H=B.currentTarget,B=B.listener,X!==z&&G.isPropagationStopped())break w;X!==null?n(X,r3,G,B,H):r3(G,B,H),z=X}}}}function F0(w,v){cz.has(w)||console.error('Did not expect a listenToNonDelegatedEvent() call for "%s". This is a bug in React. Please file an issue.',w);var g=v[u9];g===void 0&&(g=v[u9]=new Set);var x=w+"__bubble";g.has(x)||(dX(v,w,2,!1),g.add(x))}function Z9(w,v,g){cz.has(w)&&!v&&console.error('Did not expect a listenToNativeEvent() call for "%s" in the bubble phase. This is a bug in React. Please file an issue.',w);var x=0;v&&(x|=4),dX(g,w,x,v)}function B9(w){if(!w[p6]){w[p6]=!0,fH.forEach(function(g){g!=="selectionchange"&&(cz.has(g)||Z9(g,!1,w),Z9(g,!0,w))});var v=w.nodeType===9?w:w.ownerDocument;v===null||v[p6]||(v[p6]=!0,Z9("selectionchange",!1,v))}}function dX(w,v,g,x){switch(MH(v)){case R2:var z=pU;break;case g1:z=eU;break;default:z=A9}g=z.bind(null,v,g,w),z=void 0,!s9||v!=="touchstart"&&v!=="touchmove"&&v!=="wheel"||(z=!0),x?z!==void 0?w.addEventListener(v,g,{capture:!0,passive:z}):w.addEventListener(v,g,!0):z!==void 0?w.addEventListener(v,g,{passive:z}):w.addEventListener(v,g,!1)}function X9(w,v,g,x,z){var G=x;if((v&1)===0&&(v&2)===0&&x!==null)w:for(;;){if(x===null)return;var Z=x.tag;if(Z===3||Z===4){var B=x.stateNode.containerInfo;if(B===z)break;if(Z===4)for(Z=x.return;Z!==null;){var X=Z.tag;if((X===3||X===4)&&Z.stateNode.containerInfo===z)return;Z=Z.return}for(;B!==null;){if(Z=e(B),Z===null)return;if(X=Z.tag,X===5||X===6||X===26||X===27){x=G=Z;continue w}B=B.parentNode}}x=x.return}nG(function(){var H=G,Y=h8(g),L=[];w:{var U=MJ.get(w);if(U!==void 0){var R=W6,u=w;switch(w){case"keypress":if(g3(g)===0)break w;case"keydown":case"keyup":R=iK;break;case"focusin":u="focus",R=o9;break;case"focusout":u="blur",R=o9;break;case"beforeblur":case"afterblur":R=o9;break;case"click":if(g.button===2)break w;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":R=xJ;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":R=EK;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":R=oK;break;case qJ:case UJ:case KJ:R=dK;break;case WJ:R=pK;break;case"scroll":case"scrollend":R=_K;break;case"wheel":R=wW;break;case"copy":case"cut":case"paste":R=mK;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":R=GJ;break;case"toggle":case"beforetoggle":R=gW}var i=(v&4)!==0,n0=!i&&(w==="scroll"||w==="scrollend"),h0=i?U!==null?U+"Capture":null:U;i=[];for(var q=H,K;q!==null;){var W=q;if(K=W.stateNode,W=W.tag,W!==5&&W!==26&&W!==27||K===null||h0===null||(W=Y4(q,h0),W!=null&&i.push(u4(q,W,K))),n0)break;q=q.return}0<i.length&&(U=new R(U,u,null,g,Y),L.push({event:U,listeners:i}))}}if((v&7)===0){w:{if(U=w==="mouseover"||w==="pointerover",R=w==="mouseout"||w==="pointerout",U&&g!==p4&&(u=g.relatedTarget||g.fromElement)&&(e(u)||u[C5]))break w;if(R||U){if(U=Y.window===Y?Y:(U=Y.ownerDocument)?U.defaultView||U.parentWindow:window,R){if(u=g.relatedTarget||g.toElement,R=H,u=u?e(u):null,u!==null&&(n0=Aw(u),i=u.tag,u!==n0||i!==5&&i!==27&&i!==6))u=null}else R=null,u=H;if(R!==u){if(i=xJ,W="onMouseLeave",h0="onMouseEnter",q="mouse",w==="pointerout"||w==="pointerover")i=GJ,W="onPointerLeave",h0="onPointerEnter",q="pointer";if(n0=R==null?U:q0(R),K=u==null?U:q0(u),U=new i(W,q+"leave",R,g,Y),U.target=n0,U.relatedTarget=K,W=null,e(Y)===H&&(i=new i(h0,q+"enter",u,g,Y),i.target=K,i.relatedTarget=n0,W=i),n0=W,R&&u)v:{i=LU,h0=R,q=u,K=0;for(W=h0;W;W=i(W))K++;W=0;for(var F=q;F;F=i(F))W++;for(;0<K-W;)h0=i(h0),K--;for(;0<W-K;)q=i(q),W--;for(;K--;){if(h0===q||q!==null&&h0===q.alternate){i=h0;break v}h0=i(h0),q=i(q)}i=null}else i=null;R!==null&&TX(L,U,R,i,!1),u!==null&&n0!==null&&TX(L,n0,u,i,!0)}}}w:{if(U=H?q0(H):window,R=U.nodeName&&U.nodeName.toLowerCase(),R==="select"||R==="input"&&U.type==="file")var s=gZ;else if(wZ(U))if(QJ)s=Pq;else{s=Fq;var J0=kq}else R=U.nodeName,!R||R.toLowerCase()!=="input"||U.type!=="checkbox"&&U.type!=="radio"?H&&W4(H.elementType)&&(s=gZ):s=hq;if(s&&(s=s(w,H))){vZ(L,s,g,Y);break w}J0&&J0(w,U,H),w==="focusout"&&H&&U.type==="number"&&H.memoizedProps.value!=null&&O8(U,"number",U.value)}switch(J0=H?q0(H):window,w){case"focusin":if(wZ(J0)||J0.contentEditable==="true")Pg=J0,p9=H,Gx=null;break;case"focusout":Gx=p9=Pg=null;break;case"mousedown":e9=!0;break;case"contextmenu":case"mouseup":case"dragend":e9=!1,HZ(L,g,Y);break;case"selectionchange":if(ZW)break;case"keydown":case"keyup":HZ(L,g,Y)}var x0;if(t9)w:{switch(w){case"compositionstart":var w0="onCompositionStart";break w;case"compositionend":w0="onCompositionEnd";break w;case"compositionupdate":w0="onCompositionUpdate";break w}w0=void 0}else hg?pG(w,g)&&(w0="onCompositionEnd"):w==="keydown"&&g.keyCode===ZJ&&(w0="onCompositionStart");if(w0&&(BJ&&g.locale!=="ko"&&(hg||w0!=="onCompositionStart"?w0==="onCompositionEnd"&&hg&&(x0=oG()):(_5=Y,i9=("value"in _5)?_5.value:_5.textContent,hg=!0)),J0=n3(H,w0),0<J0.length&&(w0=new zJ(w0,w,null,g,Y),L.push({event:w0,listeners:J0}),x0?w0.data=x0:(x0=eG(g),x0!==null&&(w0.data=x0)))),x0=zW?Oq(w,g):Rq(w,g))w0=n3(H,"onBeforeInput"),0<w0.length&&(J0=new lK("onBeforeInput","beforeinput",null,g,Y),L.push({event:J0,listeners:w0}),J0.data=x0);YU(L,w,H,g,Y)}SX(L,v)})}function u4(w,v,g){return{instance:w,listener:v,currentTarget:g}}function n3(w,v){for(var g=v+"Capture",x=[];w!==null;){var z=w,G=z.stateNode;if(z=z.tag,z!==5&&z!==26&&z!==27||G===null||(z=Y4(w,g),z!=null&&x.unshift(u4(w,z,G)),z=Y4(w,v),z!=null&&x.push(u4(w,z,G))),w.tag===3)return x;w=w.return}return[]}function LU(w){if(w===null)return null;do w=w.return;while(w&&w.tag!==5&&w.tag!==27);return w?w:null}function TX(w,v,g,x,z){for(var G=v._reactName,Z=[];g!==null&&g!==x;){var B=g,X=B.alternate,H=B.stateNode;if(B=B.tag,X!==null&&X===x)break;B!==5&&B!==26&&B!==27||H===null||(X=H,z?(H=Y4(g,G),H!=null&&Z.unshift(u4(g,H,X))):z||(H=Y4(g,G),H!=null&&Z.push(u4(g,H,X)))),g=g.return}Z.length!==0&&w.push({event:v,listeners:Z})}function H9(w,v){Iq(w,v),w!=="input"&&w!=="textarea"&&w!=="select"||v==null||v.value!==null||vJ||(vJ=!0,w==="select"&&v.multiple?console.error("`value` prop on `%s` should not be null. Consider using an empty array when `multiple` is set to `true` to clear the component or `undefined` for uncontrolled components.",w):console.error("`value` prop on `%s` should not be null. Consider using an empty string to clear the component or `undefined` for uncontrolled components.",w));var g={registrationNameDependencies:kv,possibleRegistrationNames:l9};W4(w)||typeof v.is==="string"||jq(w,v,g),v.contentEditable&&!v.suppressContentEditableWarning&&v.children!=null&&console.error("A component is `contentEditable` and contains `children` managed by React. It is now your responsibility to guarantee that none of those nodes are unexpectedly modified or duplicated. This is probably not intentional.")}function Dw(w,v,g,x){v!==g&&(g=D5(g),D5(v)!==g&&(x[w]=v))}function IU(w,v,g){v.forEach(function(x){g[lX(x)]=x==="style"?Q9(w):w.getAttribute(x)})}function k1(w,v){v===!1?console.error("Expected `%s` listener to be a function, instead got `false`.\n\nIf you used to conditionally omit it with %s={condition && value}, pass %s={condition ? value : undefined} instead.",w,w,w):console.error("Expected `%s` listener to be a function, instead got a value of `%s` type.",w,typeof v)}function mX(w,v){return w=w.namespaceURI===q6||w.namespaceURI===Vg?w.ownerDocument.createElementNS(w.namespaceURI,w.tagName):w.ownerDocument.createElement(w.tagName),w.innerHTML=v,w.innerHTML}function D5(w){return q2(w)&&(console.error("The provided HTML markup uses a value of unsupported type %s. This value must be coerced to a string before using it here.",t2(w)),qw(w)),(typeof w==="string"?w:""+w).replace(CW,`
`).replace(_W,"")}function uX(w,v){return v=D5(v),D5(w)===v?!0:!1}function l0(w,v,g,x,z,G){switch(g){case"children":if(typeof x==="string")v3(x,v,!1),v==="body"||v==="textarea"&&x===""||K4(w,x);else if(typeof x==="number"||typeof x==="bigint")v3(""+x,v,!1),v!=="body"&&K4(w,""+x);break;case"className":px(w,"class",x);break;case"tabIndex":px(w,"tabindex",x);break;case"dir":case"role":case"viewBox":case"width":case"height":px(w,g,x);break;case"style":sG(w,x,G);break;case"data":if(v!=="object"){px(w,"data",x);break}case"src":case"href":if(x===""&&(v!=="a"||g!=="href")){g==="src"?console.error('An empty string ("") was passed to the %s attribute. This may cause the browser to download the whole page again over the network. To fix this, either do not render the element at all or pass null to %s instead of an empty string.',g,g):console.error('An empty string ("") was passed to the %s attribute. To fix this, either do not render the element at all or pass null to %s instead of an empty string.',g,g),w.removeAttribute(g);break}if(x==null||typeof x==="function"||typeof x==="symbol"||typeof x==="boolean"){w.removeAttribute(g);break}u0(x,g),x=M4(""+x),w.setAttribute(g,x);break;case"action":case"formAction":if(x!=null&&(v==="form"?g==="formAction"?console.error("You can only pass the formAction prop to <input> or <button>. Use the action prop on <form>."):typeof x==="function"&&(z.encType==null&&z.method==null||v8||(v8=!0,console.error("Cannot specify a encType or method for a form that specifies a function as the action. React provides those automatically. They will get overridden.")),z.target==null||w8||(w8=!0,console.error("Cannot specify a target for a form that specifies a function as the action. The function will always be executed in the same window."))):v==="input"||v==="button"?g==="action"?console.error("You can only pass the action prop to <form>. Use the formAction prop on <input> or <button>."):v!=="input"||z.type==="submit"||z.type==="image"||e6?v!=="button"||z.type==null||z.type==="submit"||e6?typeof x==="function"&&(z.name==null||mQ||(mQ=!0,console.error('Cannot specify a "name" prop for a button that specifies a function as a formAction. React needs it to encode which action should be invoked. It will get overridden.')),z.formEncType==null&&z.formMethod==null||v8||(v8=!0,console.error("Cannot specify a formEncType or formMethod for a button that specifies a function as a formAction. React provides those automatically. They will get overridden.")),z.formTarget==null||w8||(w8=!0,console.error("Cannot specify a formTarget for a button that specifies a function as a formAction. The function will always be executed in the same window."))):(e6=!0,console.error('A button can only specify a formAction along with type="submit" or no type.')):(e6=!0,console.error('An input can only specify a formAction along with type="submit" or type="image".')):g==="action"?console.error("You can only pass the action prop to <form>."):console.error("You can only pass the formAction prop to <input> or <button>.")),typeof x==="function"){w.setAttribute(g,"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");break}else typeof G==="function"&&(g==="formAction"?(v!=="input"&&l0(w,v,"name",z.name,z,null),l0(w,v,"formEncType",z.formEncType,z,null),l0(w,v,"formMethod",z.formMethod,z,null),l0(w,v,"formTarget",z.formTarget,z,null)):(l0(w,v,"encType",z.encType,z,null),l0(w,v,"method",z.method,z,null),l0(w,v,"target",z.target,z,null)));if(x==null||typeof x==="symbol"||typeof x==="boolean"){w.removeAttribute(g);break}u0(x,g),x=M4(""+x),w.setAttribute(g,x);break;case"onClick":x!=null&&(typeof x!=="function"&&k1(g,x),w.onclick=l1);break;case"onScroll":x!=null&&(typeof x!=="function"&&k1(g,x),F0("scroll",w));break;case"onScrollEnd":x!=null&&(typeof x!=="function"&&k1(g,x),F0("scrollend",w));break;case"dangerouslySetInnerHTML":if(x!=null){if(typeof x!=="object"||!("__html"in x))throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information.");if(g=x.__html,g!=null){if(z.children!=null)throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");w.innerHTML=g}}break;case"multiple":w.multiple=x&&typeof x!=="function"&&typeof x!=="symbol";break;case"muted":w.muted=x&&typeof x!=="function"&&typeof x!=="symbol";break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":break;case"autoFocus":break;case"xlinkHref":if(x==null||typeof x==="function"||typeof x==="boolean"||typeof x==="symbol"){w.removeAttribute("xlink:href");break}u0(x,g),g=M4(""+x),w.setAttributeNS(cv,"xlink:href",g);break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":x!=null&&typeof x!=="function"&&typeof x!=="symbol"?(u0(x,g),w.setAttribute(g,""+x)):w.removeAttribute(g);break;case"inert":x!==""||g8[g]||(g8[g]=!0,console.error("Received an empty string for a boolean attribute `%s`. This will treat the attribute as if it were false. Either pass `false` to silence this warning, or pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.",g));case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":x&&typeof x!=="function"&&typeof x!=="symbol"?w.setAttribute(g,""):w.removeAttribute(g);break;case"capture":case"download":x===!0?w.setAttribute(g,""):x!==!1&&x!=null&&typeof x!=="function"&&typeof x!=="symbol"?(u0(x,g),w.setAttribute(g,x)):w.removeAttribute(g);break;case"cols":case"rows":case"size":case"span":x!=null&&typeof x!=="function"&&typeof x!=="symbol"&&!isNaN(x)&&1<=x?(u0(x,g),w.setAttribute(g,x)):w.removeAttribute(g);break;case"rowSpan":case"start":x==null||typeof x==="function"||typeof x==="symbol"||isNaN(x)?w.removeAttribute(g):(u0(x,g),w.setAttribute(g,x));break;case"popover":F0("beforetoggle",w),F0("toggle",w),tx(w,"popover",x);break;case"xlinkActuate":u1(w,cv,"xlink:actuate",x);break;case"xlinkArcrole":u1(w,cv,"xlink:arcrole",x);break;case"xlinkRole":u1(w,cv,"xlink:role",x);break;case"xlinkShow":u1(w,cv,"xlink:show",x);break;case"xlinkTitle":u1(w,cv,"xlink:title",x);break;case"xlinkType":u1(w,cv,"xlink:type",x);break;case"xmlBase":u1(w,sz,"xml:base",x);break;case"xmlLang":u1(w,sz,"xml:lang",x);break;case"xmlSpace":u1(w,sz,"xml:space",x);break;case"is":G!=null&&console.error('Cannot update the "is" prop after it has been initialized.'),tx(w,"is",x);break;case"innerText":case"textContent":break;case"popoverTarget":uQ||x==null||typeof x!=="object"||(uQ=!0,console.error("The `popoverTarget` prop expects the ID of an Element as a string. Received %s instead.",x));default:!(2<g.length)||g[0]!=="o"&&g[0]!=="O"||g[1]!=="n"&&g[1]!=="N"?(g=iG(g),tx(w,g,x)):kv.hasOwnProperty(g)&&x!=null&&typeof x!=="function"&&k1(g,x)}}function J9(w,v,g,x,z,G){switch(g){case"style":sG(w,x,G);break;case"dangerouslySetInnerHTML":if(x!=null){if(typeof x!=="object"||!("__html"in x))throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information.");if(g=x.__html,g!=null){if(z.children!=null)throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");w.innerHTML=g}}break;case"children":typeof x==="string"?K4(w,x):(typeof x==="number"||typeof x==="bigint")&&K4(w,""+x);break;case"onScroll":x!=null&&(typeof x!=="function"&&k1(g,x),F0("scroll",w));break;case"onScrollEnd":x!=null&&(typeof x!=="function"&&k1(g,x),F0("scrollend",w));break;case"onClick":x!=null&&(typeof x!=="function"&&k1(g,x),w.onclick=l1);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"innerHTML":case"ref":break;case"innerText":case"textContent":break;default:if(kv.hasOwnProperty(g))x!=null&&typeof x!=="function"&&k1(g,x);else w:{if(g[0]==="o"&&g[1]==="n"&&(z=g.endsWith("Capture"),v=g.slice(2,z?g.length-7:void 0),G=w[sw]||null,G=G!=null?G[g]:null,typeof G==="function"&&w.removeEventListener(v,G,z),typeof x==="function")){typeof G!=="function"&&G!==null&&(g in w?w[g]=null:w.hasAttribute(g)&&w.removeAttribute(g)),w.addEventListener(v,x,z);break w}g in w?w[g]=x:x===!0?w.setAttribute(g,""):tx(w,g,x)}}}function Ew(w,v,g){switch(H9(v,g),v){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"img":F0("error",w),F0("load",w);var x=!1,z=!1,G;for(G in g)if(g.hasOwnProperty(G)){var Z=g[G];if(Z!=null)switch(G){case"src":x=!0;break;case"srcSet":z=!0;break;case"children":case"dangerouslySetInnerHTML":throw Error(v+" is a void element tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");default:l0(w,v,G,Z,g,null)}}z&&l0(w,v,"srcSet",g.srcSet,g,null),x&&l0(w,v,"src",g.src,g,null);return;case"input":W5("input",g),F0("invalid",w);var B=G=Z=z=null,X=null,H=null;for(x in g)if(g.hasOwnProperty(x)){var Y=g[x];if(Y!=null)switch(x){case"name":z=Y;break;case"type":Z=Y;break;case"checked":X=Y;break;case"defaultChecked":H=Y;break;case"value":G=Y;break;case"defaultValue":B=Y;break;case"children":case"dangerouslySetInnerHTML":if(Y!=null)throw Error(v+" is a void element tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");break;default:l0(w,v,x,Y,g,null)}}hG(w,g),PG(w,G,B,X,H,Z,z,!1);return;case"select":W5("select",g),F0("invalid",w),x=Z=G=null;for(z in g)if(g.hasOwnProperty(z)&&(B=g[z],B!=null))switch(z){case"value":G=B;break;case"defaultValue":Z=B;break;case"multiple":x=B;default:l0(w,v,z,B,g,null)}fG(w,g),v=G,g=Z,w.multiple=!!x,v!=null?xg(w,!!x,v,!1):g!=null&&xg(w,!!x,g,!0);return;case"textarea":W5("textarea",g),F0("invalid",w),G=z=x=null;for(Z in g)if(g.hasOwnProperty(Z)&&(B=g[Z],B!=null))switch(Z){case"value":x=B;break;case"defaultValue":z=B;break;case"children":G=B;break;case"dangerouslySetInnerHTML":if(B!=null)throw Error("`dangerouslySetInnerHTML` does not make sense on <textarea>.");break;default:l0(w,v,Z,B,g,null)}EG(w,g),SG(w,x,z,G);return;case"option":CG(w,g);for(X in g)if(g.hasOwnProperty(X)&&(x=g[X],x!=null))switch(X){case"selected":w.selected=x&&typeof x!=="function"&&typeof x!=="symbol";break;default:l0(w,v,X,x,g,null)}return;case"dialog":F0("beforetoggle",w),F0("toggle",w),F0("cancel",w),F0("close",w);break;case"iframe":case"object":F0("load",w);break;case"video":case"audio":for(x=0;x<Ex.length;x++)F0(Ex[x],w);break;case"image":F0("error",w),F0("load",w);break;case"details":F0("toggle",w);break;case"embed":case"source":case"link":F0("error",w),F0("load",w);case"area":case"base":case"br":case"col":case"hr":case"keygen":case"meta":case"param":case"track":case"wbr":case"menuitem":for(H in g)if(g.hasOwnProperty(H)&&(x=g[H],x!=null))switch(H){case"children":case"dangerouslySetInnerHTML":throw Error(v+" is a void element tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");default:l0(w,v,H,x,g,null)}return;default:if(W4(v)){for(Y in g)g.hasOwnProperty(Y)&&(x=g[Y],x!==void 0&&J9(w,v,Y,x,g,void 0));return}}for(B in g)g.hasOwnProperty(B)&&(x=g[B],x!=null&&l0(w,v,B,x,g,null))}function bU(w,v,g,x){switch(H9(v,x),v){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"input":var z=null,G=null,Z=null,B=null,X=null,H=null,Y=null;for(R in g){var L=g[R];if(g.hasOwnProperty(R)&&L!=null)switch(R){case"checked":break;case"value":break;case"defaultValue":X=L;default:x.hasOwnProperty(R)||l0(w,v,R,null,x,L)}}for(var U in x){var R=x[U];if(L=g[U],x.hasOwnProperty(U)&&(R!=null||L!=null))switch(U){case"type":G=R;break;case"name":z=R;break;case"checked":H=R;break;case"defaultChecked":Y=R;break;case"value":Z=R;break;case"defaultValue":B=R;break;case"children":case"dangerouslySetInnerHTML":if(R!=null)throw Error(v+" is a void element tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");break;default:R!==L&&l0(w,v,U,R,x,L)}}v=g.type==="checkbox"||g.type==="radio"?g.checked!=null:g.value!=null,x=x.type==="checkbox"||x.type==="radio"?x.checked!=null:x.value!=null,v||!x||TQ||(console.error("A component is changing an uncontrolled input to be controlled. This is likely caused by the value changing from undefined to a defined value, which should not happen. Decide between using a controlled or uncontrolled input element for the lifetime of the component. More info: https://react.dev/link/controlled-components"),TQ=!0),!v||x||dQ||(console.error("A component is changing a controlled input to be uncontrolled. This is likely caused by the value changing from a defined to undefined, which should not happen. Decide between using a controlled or uncontrolled input element for the lifetime of the component. More info: https://react.dev/link/controlled-components"),dQ=!0),A8(w,Z,B,X,H,Y,G,z);return;case"select":R=Z=B=U=null;for(G in g)if(X=g[G],g.hasOwnProperty(G)&&X!=null)switch(G){case"value":break;case"multiple":R=X;default:x.hasOwnProperty(G)||l0(w,v,G,null,x,X)}for(z in x)if(G=x[z],X=g[z],x.hasOwnProperty(z)&&(G!=null||X!=null))switch(z){case"value":U=G;break;case"defaultValue":B=G;break;case"multiple":Z=G;default:G!==X&&l0(w,v,z,G,x,X)}x=B,v=Z,g=R,U!=null?xg(w,!!v,U,!1):!!g!==!!v&&(x!=null?xg(w,!!v,x,!0):xg(w,!!v,v?[]:"",!1));return;case"textarea":R=U=null;for(B in g)if(z=g[B],g.hasOwnProperty(B)&&z!=null&&!x.hasOwnProperty(B))switch(B){case"value":break;case"children":break;default:l0(w,v,B,null,x,z)}for(Z in x)if(z=x[Z],G=g[Z],x.hasOwnProperty(Z)&&(z!=null||G!=null))switch(Z){case"value":U=z;break;case"defaultValue":R=z;break;case"children":break;case"dangerouslySetInnerHTML":if(z!=null)throw Error("`dangerouslySetInnerHTML` does not make sense on <textarea>.");break;default:z!==G&&l0(w,v,Z,z,x,G)}NG(w,U,R);return;case"option":for(var u in g)if(U=g[u],g.hasOwnProperty(u)&&U!=null&&!x.hasOwnProperty(u))switch(u){case"selected":w.selected=!1;break;default:l0(w,v,u,null,x,U)}for(X in x)if(U=x[X],R=g[X],x.hasOwnProperty(X)&&U!==R&&(U!=null||R!=null))switch(X){case"selected":w.selected=U&&typeof U!=="function"&&typeof U!=="symbol";break;default:l0(w,v,X,U,x,R)}return;case"img":case"link":case"area":case"base":case"br":case"col":case"embed":case"hr":case"keygen":case"meta":case"param":case"source":case"track":case"wbr":case"menuitem":for(var i in g)U=g[i],g.hasOwnProperty(i)&&U!=null&&!x.hasOwnProperty(i)&&l0(w,v,i,null,x,U);for(H in x)if(U=x[H],R=g[H],x.hasOwnProperty(H)&&U!==R&&(U!=null||R!=null))switch(H){case"children":case"dangerouslySetInnerHTML":if(U!=null)throw Error(v+" is a void element tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");break;default:l0(w,v,H,U,x,R)}return;default:if(W4(v)){for(var n0 in g)U=g[n0],g.hasOwnProperty(n0)&&U!==void 0&&!x.hasOwnProperty(n0)&&J9(w,v,n0,void 0,x,U);for(Y in x)U=x[Y],R=g[Y],!x.hasOwnProperty(Y)||U===R||U===void 0&&R===void 0||J9(w,v,Y,U,x,R);return}}for(var h0 in g)U=g[h0],g.hasOwnProperty(h0)&&U!=null&&!x.hasOwnProperty(h0)&&l0(w,v,h0,null,x,U);for(L in x)U=x[L],R=g[L],!x.hasOwnProperty(L)||U===R||U==null&&R==null||l0(w,v,L,U,x,R)}function lX(w){switch(w){case"class":return"className";case"for":return"htmlFor";default:return w}}function Q9(w){var v={};w=w.style;for(var g=0;g<w.length;g++){var x=w[g];v[x]=w.getPropertyValue(x)}return v}function yX(w,v,g){if(v!=null&&typeof v!=="object")console.error("The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX.");else{var x,z=x="",G;for(G in v)if(v.hasOwnProperty(G)){var Z=v[G];Z!=null&&typeof Z!=="boolean"&&Z!==""&&(G.indexOf("--")===0?(J4(Z,G),x+=z+G+":"+(""+Z).trim()):typeof Z!=="number"||Z===0||eH.has(G)?(J4(Z,G),x+=z+G.replace(rH,"-$1").toLowerCase().replace(nH,"-ms-")+":"+(""+Z).trim()):x+=z+G.replace(rH,"-$1").toLowerCase().replace(nH,"-ms-")+":"+Z+"px",z=";")}x=x||null,v=w.getAttribute("style"),v!==x&&(x=D5(x),D5(v)!==x&&(g.style=Q9(w)))}}function E2(w,v,g,x,z,G){if(z.delete(g),w=w.getAttribute(g),w===null)switch(typeof x){case"undefined":case"function":case"symbol":case"boolean":return}else if(x!=null)switch(typeof x){case"function":case"symbol":case"boolean":break;default:if(u0(x,v),w===""+x)return}Dw(v,w,x,G)}function aX(w,v,g,x,z,G){if(z.delete(g),w=w.getAttribute(g),w===null){switch(typeof x){case"function":case"symbol":return}if(!x)return}else switch(typeof x){case"function":case"symbol":break;default:if(x)return}Dw(v,w,x,G)}function $9(w,v,g,x,z,G){if(z.delete(g),w=w.getAttribute(g),w===null)switch(typeof x){case"undefined":case"function":case"symbol":return}else if(x!=null)switch(typeof x){case"function":case"symbol":break;default:if(u0(x,g),w===""+x)return}Dw(v,w,x,G)}function cX(w,v,g,x,z,G){if(z.delete(g),w=w.getAttribute(g),w===null)switch(typeof x){case"undefined":case"function":case"symbol":case"boolean":return;default:if(isNaN(x))return}else if(x!=null)switch(typeof x){case"function":case"symbol":case"boolean":break;default:if(!isNaN(x)&&(u0(x,v),w===""+x))return}Dw(v,w,x,G)}function q9(w,v,g,x,z,G){if(z.delete(g),w=w.getAttribute(g),w===null)switch(typeof x){case"undefined":case"function":case"symbol":case"boolean":return}else if(x!=null)switch(typeof x){case"function":case"symbol":case"boolean":break;default:if(u0(x,v),g=M4(""+x),w===g)return}Dw(v,w,x,G)}function sX(w,v,g,x){for(var z={},G=new Set,Z=w.attributes,B=0;B<Z.length;B++)switch(Z[B].name.toLowerCase()){case"value":break;case"checked":break;case"selected":break;default:G.add(Z[B].name)}if(W4(v)){for(var X in g)if(g.hasOwnProperty(X)){var H=g[X];if(H!=null){if(kv.hasOwnProperty(X))typeof H!=="function"&&k1(X,H);else if(g.suppressHydrationWarning!==!0)switch(X){case"children":typeof H!=="string"&&typeof H!=="number"||Dw("children",w.textContent,H,z);continue;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":continue;case"dangerouslySetInnerHTML":Z=w.innerHTML,H=H?H.__html:void 0,H!=null&&(H=mX(w,H),Dw(X,Z,H,z));continue;case"style":G.delete(X),yX(w,H,z);continue;case"offsetParent":case"offsetTop":case"offsetLeft":case"offsetWidth":case"offsetHeight":case"isContentEditable":case"outerText":case"outerHTML":G.delete(X.toLowerCase()),console.error("Assignment to read-only property will result in a no-op: `%s`",X);continue;case"className":G.delete("class"),Z=DG(w,"class",H),Dw("className",Z,H,z);continue;default:x.context===J5&&v!=="svg"&&v!=="math"?G.delete(X.toLowerCase()):G.delete(X),Z=DG(w,X,H),Dw(X,Z,H,z)}}}}else for(H in g)if(g.hasOwnProperty(H)&&(X=g[H],X!=null)){if(kv.hasOwnProperty(H))typeof X!=="function"&&k1(H,X);else if(g.suppressHydrationWarning!==!0)switch(H){case"children":typeof X!=="string"&&typeof X!=="number"||Dw("children",w.textContent,X,z);continue;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"value":case"checked":case"selected":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":continue;case"dangerouslySetInnerHTML":Z=w.innerHTML,X=X?X.__html:void 0,X!=null&&(X=mX(w,X),Z!==X&&(z[H]={__html:Z}));continue;case"className":E2(w,H,"class",X,G,z);continue;case"tabIndex":E2(w,H,"tabindex",X,G,z);continue;case"style":G.delete(H),yX(w,X,z);continue;case"multiple":G.delete(H),Dw(H,w.multiple,X,z);continue;case"muted":G.delete(H),Dw(H,w.muted,X,z);continue;case"autoFocus":G.delete("autofocus"),Dw(H,w.autofocus,X,z);continue;case"data":if(v!=="object"){G.delete(H),Z=w.getAttribute("data"),Dw(H,Z,X,z);continue}case"src":case"href":if(!(X!==""||v==="a"&&H==="href"||v==="object"&&H==="data")){H==="src"?console.error('An empty string ("") was passed to the %s attribute. This may cause the browser to download the whole page again over the network. To fix this, either do not render the element at all or pass null to %s instead of an empty string.',H,H):console.error('An empty string ("") was passed to the %s attribute. To fix this, either do not render the element at all or pass null to %s instead of an empty string.',H,H);continue}q9(w,H,H,X,G,z);continue;case"action":case"formAction":if(Z=w.getAttribute(H),typeof X==="function"){G.delete(H.toLowerCase()),H==="formAction"?(G.delete("name"),G.delete("formenctype"),G.delete("formmethod"),G.delete("formtarget")):(G.delete("enctype"),G.delete("method"),G.delete("target"));continue}else if(Z===fW){G.delete(H.toLowerCase()),Dw(H,"function",X,z);continue}q9(w,H,H.toLowerCase(),X,G,z);continue;case"xlinkHref":q9(w,H,"xlink:href",X,G,z);continue;case"contentEditable":$9(w,H,"contenteditable",X,G,z);continue;case"spellCheck":$9(w,H,"spellcheck",X,G,z);continue;case"draggable":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":$9(w,H,H,X,G,z);continue;case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":aX(w,H,H.toLowerCase(),X,G,z);continue;case"capture":case"download":w:{B=w;var Y=Z=H,L=z;if(G.delete(Y),B=B.getAttribute(Y),B===null)switch(typeof X){case"undefined":case"function":case"symbol":break w;default:if(X===!1)break w}else if(X!=null)switch(typeof X){case"function":case"symbol":break;case"boolean":if(X===!0&&B==="")break w;break;default:if(u0(X,Z),B===""+X)break w}Dw(Z,B,X,L)}continue;case"cols":case"rows":case"size":case"span":w:{if(B=w,Y=Z=H,L=z,G.delete(Y),B=B.getAttribute(Y),B===null)switch(typeof X){case"undefined":case"function":case"symbol":case"boolean":break w;default:if(isNaN(X)||1>X)break w}else if(X!=null)switch(typeof X){case"function":case"symbol":case"boolean":break;default:if(!(isNaN(X)||1>X)&&(u0(X,Z),B===""+X))break w}Dw(Z,B,X,L)}continue;case"rowSpan":cX(w,H,"rowspan",X,G,z);continue;case"start":cX(w,H,H,X,G,z);continue;case"xHeight":E2(w,H,"x-height",X,G,z);continue;case"xlinkActuate":E2(w,H,"xlink:actuate",X,G,z);continue;case"xlinkArcrole":E2(w,H,"xlink:arcrole",X,G,z);continue;case"xlinkRole":E2(w,H,"xlink:role",X,G,z);continue;case"xlinkShow":E2(w,H,"xlink:show",X,G,z);continue;case"xlinkTitle":E2(w,H,"xlink:title",X,G,z);continue;case"xlinkType":E2(w,H,"xlink:type",X,G,z);continue;case"xmlBase":E2(w,H,"xml:base",X,G,z);continue;case"xmlLang":E2(w,H,"xml:lang",X,G,z);continue;case"xmlSpace":E2(w,H,"xml:space",X,G,z);continue;case"inert":X!==""||g8[H]||(g8[H]=!0,console.error("Received an empty string for a boolean attribute `%s`. This will treat the attribute as if it were false. Either pass `false` to silence this warning, or pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.",H)),aX(w,H,H,X,G,z);continue;default:if(!(2<H.length)||H[0]!=="o"&&H[0]!=="O"||H[1]!=="n"&&H[1]!=="N"){B=iG(H),Z=!1,x.context===J5&&v!=="svg"&&v!=="math"?G.delete(B.toLowerCase()):(Y=H.toLowerCase(),Y=U6.hasOwnProperty(Y)?U6[Y]||null:null,Y!==null&&Y!==H&&(Z=!0,G.delete(Y)),G.delete(B));w:if(Y=w,L=B,B=X,$4(L))if(Y.hasAttribute(L))Y=Y.getAttribute(L),u0(B,L),B=Y===""+B?B:Y;else{switch(typeof B){case"function":case"symbol":break w;case"boolean":if(Y=L.toLowerCase().slice(0,5),Y!=="data-"&&Y!=="aria-")break w}B=B===void 0?void 0:null}else B=void 0;Z||Dw(H,B,X,z)}}}return 0<G.size&&g.suppressHydrationWarning!==!0&&IU(w,G,z),Object.keys(z).length===0?null:z}function jU(w,v){switch(w.length){case 0:return"";case 1:return w[0];case 2:return w[0]+" "+v+" "+w[1];default:return w.slice(0,-1).join(", ")+", "+v+" "+w[w.length-1]}}function iX(w){switch(w){case"css":case"script":case"font":case"img":case"image":case"input":case"link":return!0;default:return!1}}function AU(){if(typeof performance.getEntriesByType==="function"){for(var w=0,v=0,g=performance.getEntriesByType("resource"),x=0;x<g.length;x++){var z=g[x],G=z.transferSize,Z=z.initiatorType,B=z.duration;if(G&&B&&iX(Z)){Z=0,B=z.responseEnd;for(x+=1;x<g.length;x++){var X=g[x],H=X.startTime;if(H>B)break;var{transferSize:Y,initiatorType:L}=X;Y&&iX(L)&&(X=X.responseEnd,Z+=Y*(X<B?1:(B-H)/(X-H)))}if(--x,v+=8*(G+Z)/(z.duration/1000),w++,10<w)break}}if(0<w)return v/w/1e6}return navigator.connection&&(w=navigator.connection.downlink,typeof w==="number")?w:5}function o3(w){return w.nodeType===9?w:w.ownerDocument}function rX(w){switch(w){case Vg:return g4;case q6:return z8;default:return J5}}function nX(w,v){if(w===J5)switch(v){case"svg":return g4;case"math":return z8;default:return J5}return w===g4&&v==="foreignObject"?J5:w}function U9(w,v){return w==="textarea"||w==="noscript"||typeof v.children==="string"||typeof v.children==="number"||typeof v.children==="bigint"||typeof v.dangerouslySetInnerHTML==="object"&&v.dangerouslySetInnerHTML!==null&&v.dangerouslySetInnerHTML.__html!=null}function OU(){var w=window.event;if(w&&w.type==="popstate"){if(w===oz)return!1;return oz=w,!0}return oz=null,!1}function l4(){var w=window.event;return w&&w!==dx?w.type:null}function y4(){var w=window.event;return w&&w!==dx?w.timeStamp:-1.1}function RU(w){setTimeout(function(){throw w})}function VU(w,v,g){switch(v){case"button":case"input":case"select":case"textarea":g.autoFocus&&w.focus();break;case"img":g.src?w.src=g.src:g.srcSet&&(w.srcset=g.srcSet)}}function DU(){}function kU(w,v,g,x){bU(w,v,g,x),w[sw]=x}function oX(w){K4(w,"")}function FU(w,v,g){w.nodeValue=g}function tX(w){if(!w.__reactWarnedAboutChildrenConflict){var v=w[sw]||null;if(v!==null){var g=$0(w);g!==null&&(typeof v.children==="string"||typeof v.children==="number"?(w.__reactWarnedAboutChildrenConflict=!0,n(g,function(){console.error('Cannot use a ref on a React element as a container to `createRoot` or `createPortal` if that element also sets "children" text content using React. It should be a leaf with no children. Otherwise it\'s ambiguous which children should be used.')})):v.dangerouslySetInnerHTML!=null&&(w.__reactWarnedAboutChildrenConflict=!0,n(g,function(){console.error('Cannot use a ref on a React element as a container to `createRoot` or `createPortal` if that element also sets "dangerouslySetInnerHTML" using React. It should be a leaf with no children. Otherwise it\'s ambiguous which children should be used.')})))}}}function k5(w){return w==="head"}function hU(w,v){w.removeChild(v)}function PU(w,v){(w.nodeType===9?w.body:w.nodeName==="HTML"?w.ownerDocument.body:w).removeChild(v)}function pX(w,v){var g=v,x=0;do{var z=g.nextSibling;if(w.removeChild(g),z&&z.nodeType===8)if(g=z.data,g===Sx||g===x8){if(x===0){w.removeChild(z),Ig(v);return}x--}else if(g===Nx||g===p5||g===iv||g===v4||g===sv)x++;else if(g===NW)a4(w.ownerDocument.documentElement);else if(g===dW){g=w.ownerDocument.head,a4(g);for(var G=g.firstChild;G;){var{nextSibling:Z,nodeName:B}=G;G[t4]||B==="SCRIPT"||B==="STYLE"||B==="LINK"&&G.rel.toLowerCase()==="stylesheet"||g.removeChild(G),G=Z}}else g===SW&&a4(w.ownerDocument.body);g=z}while(g);Ig(v)}function eX(w,v){var g=w;w=0;do{var x=g.nextSibling;if(g.nodeType===1?v?(g._stashedDisplay=g.style.display,g.style.display="none"):(g.style.display=g._stashedDisplay||"",g.getAttribute("style")===""&&g.removeAttribute("style")):g.nodeType===3&&(v?(g._stashedText=g.nodeValue,g.nodeValue=""):g.nodeValue=g._stashedText||""),x&&x.nodeType===8)if(g=x.data,g===Sx)if(w===0)break;else w--;else g!==Nx&&g!==p5&&g!==iv&&g!==v4||w++;g=x}while(g)}function CU(w){eX(w,!0)}function _U(w){w=w.style,typeof w.setProperty==="function"?w.setProperty("display","none","important"):w.display="none"}function fU(w){w.nodeValue=""}function EU(w){eX(w,!1)}function NU(w,v){v=v[TW],v=v!==void 0&&v!==null&&v.hasOwnProperty("display")?v.display:null,w.style.display=v==null||typeof v==="boolean"?"":(""+v).trim()}function SU(w,v){w.nodeValue=v}function K9(w){var v=w.firstChild;v&&v.nodeType===10&&(v=v.nextSibling);for(;v;){var g=v;switch(v=v.nextSibling,g.nodeName){case"HTML":case"HEAD":case"BODY":K9(g),c(g);continue;case"SCRIPT":case"STYLE":continue;case"LINK":if(g.rel.toLowerCase()==="stylesheet")continue}w.removeChild(g)}}function dU(w,v,g,x){for(;w.nodeType===1;){var z=g;if(w.nodeName.toLowerCase()!==v.toLowerCase()){if(!x&&(w.nodeName!=="INPUT"||w.type!=="hidden"))break}else if(!x)if(v==="input"&&w.type==="hidden"){u0(z.name,"name");var G=z.name==null?null:""+z.name;if(z.type==="hidden"&&w.getAttribute("name")===G)return w}else return w;else if(!w[t4])switch(v){case"meta":if(!w.hasAttribute("itemprop"))break;return w;case"link":if(G=w.getAttribute("rel"),G==="stylesheet"&&w.hasAttribute("data-precedence"))break;else if(G!==z.rel||w.getAttribute("href")!==(z.href==null||z.href===""?null:z.href)||w.getAttribute("crossorigin")!==(z.crossOrigin==null?null:z.crossOrigin)||w.getAttribute("title")!==(z.title==null?null:z.title))break;return w;case"style":if(w.hasAttribute("data-precedence"))break;return w;case"script":if(G=w.getAttribute("src"),(G!==(z.src==null?null:z.src)||w.getAttribute("type")!==(z.type==null?null:z.type)||w.getAttribute("crossorigin")!==(z.crossOrigin==null?null:z.crossOrigin))&&G&&w.hasAttribute("async")&&!w.hasAttribute("itemprop"))break;return w;default:return w}if(w=j2(w.nextSibling),w===null)break}return null}function TU(w,v,g){if(v==="")return null;for(;w.nodeType!==3;){if((w.nodeType!==1||w.nodeName!=="INPUT"||w.type!=="hidden")&&!g)return null;if(w=j2(w.nextSibling),w===null)return null}return w}function wH(w,v){for(;w.nodeType!==8;){if((w.nodeType!==1||w.nodeName!=="INPUT"||w.type!=="hidden")&&!v)return null;if(w=j2(w.nextSibling),w===null)return null}return w}function W9(w){return w.data===p5||w.data===iv}function M9(w){return w.data===v4||w.data===p5&&w.ownerDocument.readyState!==yQ}function mU(w,v){var g=w.ownerDocument;if(w.data===iv)w._reactRetry=v;else if(w.data!==p5||g.readyState!==yQ)v();else{var x=function(){v(),g.removeEventListener("DOMContentLoaded",x)};g.addEventListener("DOMContentLoaded",x),w._reactRetry=x}}function j2(w){for(;w!=null;w=w.nextSibling){var v=w.nodeType;if(v===1||v===3)break;if(v===8){if(v=w.data,v===Nx||v===v4||v===p5||v===iv||v===sv||v===iz||v===lQ)break;if(v===Sx||v===x8)return null}}return w}function vH(w){if(w.nodeType===1){for(var v=w.nodeName.toLowerCase(),g={},x=w.attributes,z=0;z<x.length;z++){var G=x[z];g[lX(G.name)]=G.name.toLowerCase()==="style"?Q9(w):G.value}return{type:v,props:g}}return w.nodeType===8?w.data===sv?{type:"Activity",props:{}}:{type:"Suspense",props:{}}:w.nodeValue}function gH(w,v,g){return g===null||g[EW]!==!0?(w.nodeValue===v?w=null:(v=D5(v),w=D5(w.nodeValue)===v?null:w.nodeValue),w):null}function Y9(w){w=w.nextSibling;for(var v=0;w;){if(w.nodeType===8){var g=w.data;if(g===Sx||g===x8){if(v===0)return j2(w.nextSibling);v--}else g!==Nx&&g!==v4&&g!==p5&&g!==iv&&g!==sv||v++}w=w.nextSibling}return null}function xH(w){w=w.previousSibling;for(var v=0;w;){if(w.nodeType===8){var g=w.data;if(g===Nx||g===v4||g===p5||g===iv||g===sv){if(v===0)return w;v--}else g!==Sx&&g!==x8||v++}w=w.previousSibling}return null}function uU(w){Ig(w)}function lU(w){Ig(w)}function yU(w){Ig(w)}function zH(w,v,g,x,z){switch(z&&F8(w,x.ancestorInfo),v=o3(g),w){case"html":if(w=v.documentElement,!w)throw Error("React expected an <html> element (document.documentElement) to exist in the Document but one was not found. React never removes the documentElement for any Document it renders into so the cause is likely in some other script running on this page.");return w;case"head":if(w=v.head,!w)throw Error("React expected a <head> element (document.head) to exist in the Document but one was not found. React never removes the head for any Document it renders into so the cause is likely in some other script running on this page.");return w;case"body":if(w=v.body,!w)throw Error("React expected a <body> element (document.body) to exist in the Document but one was not found. React never removes the body for any Document it renders into so the cause is likely in some other script running on this page.");return w;default:throw Error("resolveSingletonInstance was called with an element type that is not supported. This is a bug in React.")}}function aU(w,v,g,x){if(!g[C5]&&$0(g)){var z=g.tagName.toLowerCase();console.error("You are mounting a new %s component when a previous one has not first unmounted. It is an error to render more than one %s component at a time and attributes and children of these components will likely fail in unpredictable ways. Please only render a single instance of <%s> and if you need to mount a new one, ensure any previous ones have unmounted first.",z,z,z)}switch(w){case"html":case"head":case"body":break;default:console.error("acquireSingletonInstance was called with an element type that is not supported. This is a bug in React.")}for(z=g.attributes;z.length;)g.removeAttributeNode(z[0]);Ew(g,w,v),g[Nw]=x,g[sw]=v}function a4(w){for(var v=w.attributes;v.length;)w.removeAttributeNode(v[0]);c(w)}function t3(w){return typeof w.getRootNode==="function"?w.getRootNode():w.nodeType===9?w:w.ownerDocument}function GH(w,v,g){var x=x4;if(x&&typeof v==="string"&&v){var z=f2(v);z='link[rel="'+w+'"][href="'+z+'"]',typeof g==="string"&&(z+='[crossorigin="'+g+'"]'),nQ.has(z)||(nQ.add(z),w={rel:w,crossOrigin:g,href:v},x.querySelector(z)===null&&(v=x.createElement("link"),Ew(v,"link",w),z0(v),x.head.appendChild(v)))}}function ZH(w,v,g,x){var z=(z=h5.current)?t3(z):null;if(!z)throw Error('"resourceRoot" was expected to exist. This is a bug in React.');switch(w){case"meta":case"title":return null;case"style":return typeof g.precedence==="string"&&typeof g.href==="string"?(g=Yg(g.href),v=C0(z).hoistableStyles,x=v.get(g),x||(x={type:"style",instance:null,count:0,state:null},v.set(g,x)),x):{type:"void",instance:null,count:0,state:null};case"link":if(g.rel==="stylesheet"&&typeof g.href==="string"&&typeof g.precedence==="string"){w=Yg(g.href);var G=C0(z).hoistableStyles,Z=G.get(w);if(!Z&&(z=z.ownerDocument||z,Z={type:"stylesheet",instance:null,count:0,state:{loading:nv,preload:null}},G.set(w,Z),(G=z.querySelector(c4(w)))&&!G._p&&(Z.instance=G,Z.state.loading=Tx|s2),!i2.has(w))){var B={rel:"preload",as:"style",href:g.href,crossOrigin:g.crossOrigin,integrity:g.integrity,media:g.media,hrefLang:g.hrefLang,referrerPolicy:g.referrerPolicy};i2.set(w,B),G||cU(z,w,B,Z.state)}if(v&&x===null)throw g=`

  - `+p3(v)+`
  + `+p3(g),Error("Expected <link> not to update to be updated to a stylesheet with precedence. Check the `rel`, `href`, and `precedence` props of this component. Alternatively, check whether two different <link> components render in the same slot or share the same key."+g);return Z}if(v&&x!==null)throw g=`

  - `+p3(v)+`
  + `+p3(g),Error("Expected stylesheet with precedence to not be updated to a different kind of <link>. Check the `rel`, `href`, and `precedence` props of this component. Alternatively, check whether two different <link> components render in the same slot or share the same key."+g);return null;case"script":return v=g.async,g=g.src,typeof g==="string"&&v&&typeof v!=="function"&&typeof v!=="symbol"?(g=Lg(g),v=C0(z).hoistableScripts,x=v.get(g),x||(x={type:"script",instance:null,count:0,state:null},v.set(g,x)),x):{type:"void",instance:null,count:0,state:null};default:throw Error('getResource encountered a type it did not expect: "'+w+'". this is a bug in React.')}}function p3(w){var v=0,g="<link";return typeof w.rel==="string"?(v++,g+=' rel="'+w.rel+'"'):v1.call(w,"rel")&&(v++,g+=' rel="'+(w.rel===null?"null":"invalid type "+typeof w.rel)+'"'),typeof w.href==="string"?(v++,g+=' href="'+w.href+'"'):v1.call(w,"href")&&(v++,g+=' href="'+(w.href===null?"null":"invalid type "+typeof w.href)+'"'),typeof w.precedence==="string"?(v++,g+=' precedence="'+w.precedence+'"'):v1.call(w,"precedence")&&(v++,g+=" precedence={"+(w.precedence===null?"null":"invalid type "+typeof w.precedence)+"}"),Object.getOwnPropertyNames(w).length>v&&(g+=" ..."),g+" />"}function Yg(w){return'href="'+f2(w)+'"'}function c4(w){return'link[rel="stylesheet"]['+w+"]"}function BH(w){return O0({},w,{"data-precedence":w.precedence,precedence:null})}function cU(w,v,g,x){w.querySelector('link[rel="preload"][as="style"]['+v+"]")?x.loading=Tx:(v=w.createElement("link"),x.preload=v,v.addEventListener("load",function(){return x.loading|=Tx}),v.addEventListener("error",function(){return x.loading|=iQ}),Ew(v,"link",g),z0(v),w.head.appendChild(v))}function Lg(w){return'[src="'+f2(w)+'"]'}function s4(w){return"script[async]"+w}function XH(w,v,g){if(v.count++,v.instance===null)switch(v.type){case"style":var x=w.querySelector('style[data-href~="'+f2(g.href)+'"]');if(x)return v.instance=x,z0(x),x;var z=O0({},g,{"data-href":g.href,"data-precedence":g.precedence,href:null,precedence:null});return x=(w.ownerDocument||w).createElement("style"),z0(x),Ew(x,"style",z),e3(x,g.precedence,w),v.instance=x;case"stylesheet":z=Yg(g.href);var G=w.querySelector(c4(z));if(G)return v.state.loading|=s2,v.instance=G,z0(G),G;x=BH(g),(z=i2.get(z))&&L9(x,z),G=(w.ownerDocument||w).createElement("link"),z0(G);var Z=G;return Z._p=new Promise(function(B,X){Z.onload=B,Z.onerror=X}),Ew(G,"link",x),v.state.loading|=s2,e3(G,g.precedence,w),v.instance=G;case"script":if(G=Lg(g.src),z=w.querySelector(s4(G)))return v.instance=z,z0(z),z;if(x=g,z=i2.get(G))x=O0({},g),I9(x,z);return w=w.ownerDocument||w,z=w.createElement("script"),z0(z),Ew(z,"link",x),w.head.appendChild(z),v.instance=z;case"void":return null;default:throw Error('acquireResource encountered a resource type it did not expect: "'+v.type+'". this is a bug in React.')}else v.type==="stylesheet"&&(v.state.loading&s2)===nv&&(x=v.instance,v.state.loading|=s2,e3(x,g.precedence,w));return v.instance}function e3(w,v,g){for(var x=g.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'),z=x.length?x[x.length-1]:null,G=z,Z=0;Z<x.length;Z++){var B=x[Z];if(B.dataset.precedence===v)G=B;else if(G!==z)break}G?G.parentNode.insertBefore(w,G.nextSibling):(v=g.nodeType===9?g.head:g,v.insertBefore(w,v.firstChild))}function L9(w,v){w.crossOrigin==null&&(w.crossOrigin=v.crossOrigin),w.referrerPolicy==null&&(w.referrerPolicy=v.referrerPolicy),w.title==null&&(w.title=v.title)}function I9(w,v){w.crossOrigin==null&&(w.crossOrigin=v.crossOrigin),w.referrerPolicy==null&&(w.referrerPolicy=v.referrerPolicy),w.integrity==null&&(w.integrity=v.integrity)}function HH(w,v,g){if(G8===null){var x=new Map,z=G8=new Map;z.set(g,x)}else z=G8,x=z.get(g),x||(x=new Map,z.set(g,x));if(x.has(w))return x;x.set(w,null),g=g.getElementsByTagName(w);for(z=0;z<g.length;z++){var G=g[z];if(!(G[t4]||G[Nw]||w==="link"&&G.getAttribute("rel")==="stylesheet")&&G.namespaceURI!==Vg){var Z=G.getAttribute(v)||"";Z=w+Z;var B=x.get(Z);B?B.push(G):x.set(Z,[G])}}return x}function JH(w,v,g){w=w.ownerDocument||w,w.head.insertBefore(g,v==="title"?w.querySelector("head > title"):null)}function sU(w,v,g){var x=!g.ancestorInfo.containerTagInScope;if(g.context===g4||v.itemProp!=null)return!x||v.itemProp==null||w!=="meta"&&w!=="title"&&w!=="style"&&w!=="link"&&w!=="script"||console.error("Cannot render a <%s> outside the main document if it has an `itemProp` prop. `itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. If you were intending for React to hoist this <%s> remove the `itemProp` prop. Otherwise, try moving this tag into the <head> or <body> of the Document.",w,w),!1;switch(w){case"meta":case"title":return!0;case"style":if(typeof v.precedence!=="string"||typeof v.href!=="string"||v.href===""){x&&console.error('Cannot render a <style> outside the main document without knowing its precedence and a unique href key. React can hoist and deduplicate <style> tags if you provide a `precedence` prop along with an `href` prop that does not conflict with the `href` values used in any other hoisted <style> or <link rel="stylesheet" ...> tags.  Note that hoisting <style> tags is considered an advanced feature that most will not use directly. Consider moving the <style> tag to the <head> or consider adding a `precedence="default"` and `href="some unique resource identifier"`.');break}return!0;case"link":if(typeof v.rel!=="string"||typeof v.href!=="string"||v.href===""||v.onLoad||v.onError){if(v.rel==="stylesheet"&&typeof v.precedence==="string"){w=v.href;var{onError:z,disabled:G}=v;g=[],v.onLoad&&g.push("`onLoad`"),z&&g.push("`onError`"),G!=null&&g.push("`disabled`"),z=jU(g,"and"),z+=g.length===1?" prop":" props",G=g.length===1?"an "+z:"the "+z,g.length&&console.error('React encountered a <link rel="stylesheet" href="%s" ... /> with a `precedence` prop that also included %s. The presence of loading and error handlers indicates an intent to manage the stylesheet loading state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the %s, otherwise remove the `precedence` prop.',w,G,z)}x&&(typeof v.rel!=="string"||typeof v.href!=="string"||v.href===""?console.error("Cannot render a <link> outside the main document without a `rel` and `href` prop. Try adding a `rel` and/or `href` prop to this <link> or moving the link into the <head> tag"):(v.onError||v.onLoad)&&console.error("Cannot render a <link> with onLoad or onError listeners outside the main document. Try removing onLoad={...} and onError={...} or moving it into the root <head> tag or somewhere in the <body>."));break}switch(v.rel){case"stylesheet":return w=v.precedence,v=v.disabled,typeof w!=="string"&&x&&console.error('Cannot render a <link rel="stylesheet" /> outside the main document without knowing its precedence. Consider adding precedence="default" or moving it into the root <head> tag.'),typeof w==="string"&&v==null;default:return!0}case"script":if(w=v.async&&typeof v.async!=="function"&&typeof v.async!=="symbol",!w||v.onLoad||v.onError||!v.src||typeof v.src!=="string"){x&&(w?v.onLoad||v.onError?console.error("Cannot render a <script> with onLoad or onError listeners outside the main document. Try removing onLoad={...} and onError={...} or moving it into the root <head> tag or somewhere in the <body>."):console.error("Cannot render a <script> outside the main document without `async={true}` and a non-empty `src` prop. Ensure there is a valid `src` and either make the script async or move it into the root <head> tag or somewhere in the <body>."):console.error('Cannot render a sync or defer <script> outside the main document without knowing its order. Try adding async="" or moving it into the root <head> tag.'));break}return!0;case"noscript":case"template":x&&console.error("Cannot render <%s> outside the main document. Try moving it into the root <head> tag.",w)}return!1}function QH(w){return w.type==="stylesheet"&&(w.state.loading&rQ)===nv?!1:!0}function iU(w,v,g,x){if(g.type==="stylesheet"&&(typeof x.media!=="string"||matchMedia(x.media).matches!==!1)&&(g.state.loading&s2)===nv){if(g.instance===null){var z=Yg(x.href),G=v.querySelector(c4(z));if(G){v=G._p,v!==null&&typeof v==="object"&&typeof v.then==="function"&&(w.count++,w=w6.bind(w),v.then(w,w)),g.state.loading|=s2,g.instance=G,z0(G);return}G=v.ownerDocument||v,x=BH(x),(z=i2.get(z))&&L9(x,z),G=G.createElement("link"),z0(G);var Z=G;Z._p=new Promise(function(B,X){Z.onload=B,Z.onerror=X}),Ew(G,"link",x),g.instance=G}w.stylesheets===null&&(w.stylesheets=new Map),w.stylesheets.set(g,v),(v=g.state.preload)&&(g.state.loading&rQ)===nv&&(w.count++,g=w6.bind(w),v.addEventListener("load",g),v.addEventListener("error",g))}}function rU(w,v){return w.stylesheets&&w.count===0&&v6(w,w.stylesheets),0<w.count||0<w.imgCount?function(g){var x=setTimeout(function(){if(w.stylesheets&&v6(w,w.stylesheets),w.unsuspend){var G=w.unsuspend;w.unsuspend=null,G()}},lW+v);0<w.imgBytes&&pz===0&&(pz=125*AU()*aW);var z=setTimeout(function(){if(w.waitingForImages=!1,w.count===0&&(w.stylesheets&&v6(w,w.stylesheets),w.unsuspend)){var G=w.unsuspend;w.unsuspend=null,G()}},(w.imgBytes>pz?50:yW)+v);return w.unsuspend=g,function(){w.unsuspend=null,clearTimeout(x),clearTimeout(z)}}:null}function w6(){if(this.count--,this.count===0&&(this.imgCount===0||!this.waitingForImages)){if(this.stylesheets)v6(this,this.stylesheets);else if(this.unsuspend){var w=this.unsuspend;this.unsuspend=null,w()}}}function v6(w,v){w.stylesheets=null,w.unsuspend!==null&&(w.count++,Z8=new Map,v.forEach(nU,w),Z8=null,w6.call(w))}function nU(w,v){if(!(v.state.loading&s2)){var g=Z8.get(w);if(g)var x=g.get(ez);else{g=new Map,Z8.set(w,g);for(var z=w.querySelectorAll("link[data-precedence],style[data-precedence]"),G=0;G<z.length;G++){var Z=z[G];if(Z.nodeName==="LINK"||Z.getAttribute("media")!=="not all")g.set(Z.dataset.precedence,Z),x=Z}x&&g.set(ez,x)}z=v.instance,Z=z.getAttribute("data-precedence"),G=g.get(Z)||x,G===x&&g.set(ez,z),g.set(Z,z),this.count++,x=w6.bind(this),z.addEventListener("load",x),z.addEventListener("error",x),G?G.parentNode.insertBefore(z,G.nextSibling):(w=w.nodeType===9?w.head:w,w.insertBefore(z,w.firstChild)),v.state.loading|=s2}}function oU(w,v,g,x,z,G,Z,B,X){this.tag=1,this.containerInfo=w,this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=rv,this.callbackNode=this.next=this.pendingContext=this.context=this.cancelPendingCommit=null,this.callbackPriority=0,this.expirationTimes=gg(-1),this.entangledLanes=this.shellSuspendCounter=this.errorRecoveryDisabledLanes=this.expiredLanes=this.warmLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=gg(0),this.hiddenUpdates=gg(null),this.identifierPrefix=x,this.onUncaughtError=z,this.onCaughtError=G,this.onRecoverableError=Z,this.pooledCache=null,this.pooledCacheLanes=0,this.formState=X,this.incompleteTransitions=new Map,this.passiveEffectDuration=this.effectDuration=-0,this.memoizedUpdaters=new Set,w=this.pendingUpdatersLaneMap=[];for(v=0;31>v;v++)w.push(new Set);this._debugRootType=g?"hydrateRoot()":"createRoot()"}function $H(w,v,g,x,z,G,Z,B,X,H,Y,L){return w=new oU(w,v,g,Z,X,H,Y,L,B),v=KW,G===!0&&(v|=uw|x1),v|=Y0,G=E(3,null,null,v),w.current=G,G.stateNode=w,v=r8(),bv(v),w.pooledCache=v,bv(v),G.memoizedState={element:x,isDehydrated:g,cache:v},e8(G),w}function qH(w){if(!w)return N5;return w=N5,w}function b9(w,v,g,x,z,G){if(mw&&typeof mw.onScheduleFiberRoot==="function")try{mw.onScheduleFiberRoot(Og,x,g)}catch(Z){C1||(C1=!0,console.error("React instrumentation encountered an error: %o",Z))}z=qH(z),x.context===null?x.context=z:x.pendingContext=z,P1&&O2!==null&&!eQ&&(eQ=!0,console.error(`Render methods should be a pure function of props and state; triggering nested component updates from render is not allowed. If necessary, trigger nested updates in componentDidUpdate.

Check the render method of %s.`,l(O2)||"Unknown")),x=b5(v),x.payload={element:g},G=G===void 0?null:G,G!==null&&(typeof G!=="function"&&console.error("Expected the last optional `callback` argument to be a function. Instead received: %s.",G),x.callback=G),g=j5(w,x,v),g!==null&&(W1(v,"root.render()",null),Bw(g,w,v),V4(g,w,v))}function UH(w,v){if(w=w.memoizedState,w!==null&&w.dehydrated!==null){var g=w.retryLane;w.retryLane=g!==0&&g<v?g:v}}function j9(w,v){UH(w,v),(w=w.alternate)&&UH(w,v)}function KH(w){if(w.tag===13||w.tag===31){var v=Tw(w,67108864);v!==null&&Bw(v,w,67108864),j9(w,67108864)}}function WH(w){if(w.tag===13||w.tag===31){var v=b2(w);v=$v(v);var g=Tw(w,v);g!==null&&Bw(g,w,v),j9(w,v)}}function tU(){return O2}function pU(w,v,g,x){var z=k.T;k.T=null;var G=d0.p;try{d0.p=R2,A9(w,v,g,x)}finally{d0.p=G,k.T=z}}function eU(w,v,g,x){var z=k.T;k.T=null;var G=d0.p;try{d0.p=g1,A9(w,v,g,x)}finally{d0.p=G,k.T=z}}function A9(w,v,g,x){if(X8){var z=O9(x);if(z===null)X9(w,v,x,H8,g),YH(w,x);else if(wK(z,w,v,g,x))x.stopPropagation();else if(YH(w,x),v&4&&-1<sW.indexOf(w)){for(;z!==null;){var G=$0(z);if(G!==null)switch(G.tag){case 3:if(G=G.stateNode,G.current.memoizedState.isDehydrated){var Z=$1(G.pendingLanes);if(Z!==0){var B=G;B.pendingLanes|=2;for(B.entangledLanes|=2;Z;){var X=1<<31-cw(Z);B.entanglements[1]|=X,Z&=~X}D1(G),(P0&(Vw|F2))===Pw&&(c6=kw()+DQ,m4(0,!1))}}break;case 31:case 13:B=Tw(G,2),B!==null&&Bw(B,G,2),Kg(),j9(G,2)}if(G=O9(x),G===null&&X9(w,v,x,H8,g),G===z)break;z=G}z!==null&&x.stopPropagation()}else X9(w,v,x,null,g)}}function O9(w){return w=h8(w),R9(w)}function R9(w){if(H8=null,w=e(w),w!==null){var v=Aw(w);if(v===null)w=null;else{var g=v.tag;if(g===13){if(w=Cw(v),w!==null)return w;w=null}else if(g===31){if(w=$w(v),w!==null)return w;w=null}else if(g===3){if(v.stateNode.current.memoizedState.isDehydrated)return v.tag===3?v.stateNode.containerInfo:null;w=null}else v!==w&&(w=null)}}return H8=w,null}function MH(w){switch(w){case"beforetoggle":case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"toggle":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return R2;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return g1;case"message":switch(HK()){case d9:return R2;case T9:return g1;case Ag:case JK:return f1;case m9:return Q6;default:return f1}default:return f1}}function YH(w,v){switch(w){case"focusin":case"focusout":e5=null;break;case"dragenter":case"dragleave":wv=null;break;case"mouseover":case"mouseout":vv=null;break;case"pointerover":case"pointerout":ux.delete(v.pointerId);break;case"gotpointercapture":case"lostpointercapture":lx.delete(v.pointerId)}}function i4(w,v,g,x,z,G){if(w===null||w.nativeEvent!==G)return w={blockedOn:v,domEventName:g,eventSystemFlags:x,nativeEvent:G,targetContainers:[z]},v!==null&&(v=$0(v),v!==null&&KH(v)),w;return w.eventSystemFlags|=x,v=w.targetContainers,z!==null&&v.indexOf(z)===-1&&v.push(z),w}function wK(w,v,g,x,z){switch(v){case"focusin":return e5=i4(e5,w,v,g,x,z),!0;case"dragenter":return wv=i4(wv,w,v,g,x,z),!0;case"mouseover":return vv=i4(vv,w,v,g,x,z),!0;case"pointerover":var G=z.pointerId;return ux.set(G,i4(ux.get(G)||null,w,v,g,x,z)),!0;case"gotpointercapture":return G=z.pointerId,lx.set(G,i4(lx.get(G)||null,w,v,g,x,z)),!0}return!1}function LH(w){var v=e(w.target);if(v!==null){var g=Aw(v);if(g!==null){if(v=g.tag,v===13){if(v=Cw(g),v!==null){w.blockedOn=v,N(w.priority,function(){WH(g)});return}}else if(v===31){if(v=$w(g),v!==null){w.blockedOn=v,N(w.priority,function(){WH(g)});return}}else if(v===3&&g.stateNode.current.memoizedState.isDehydrated){w.blockedOn=g.tag===3?g.stateNode.containerInfo:null;return}}}w.blockedOn=null}function g6(w){if(w.blockedOn!==null)return!1;for(var v=w.targetContainers;0<v.length;){var g=O9(w.nativeEvent);if(g===null){g=w.nativeEvent;var x=new g.constructor(g.type,g),z=x;p4!==null&&console.error("Expected currently replaying event to be null. This error is likely caused by a bug in React. Please file an issue."),p4=z,g.target.dispatchEvent(x),p4===null&&console.error("Expected currently replaying event to not be null. This error is likely caused by a bug in React. Please file an issue."),p4=null}else return v=$0(g),v!==null&&KH(v),w.blockedOn=g,!1;v.shift()}return!0}function IH(w,v,g){g6(w)&&g.delete(v)}function vK(){wG=!1,e5!==null&&g6(e5)&&(e5=null),wv!==null&&g6(wv)&&(wv=null),vv!==null&&g6(vv)&&(vv=null),ux.forEach(IH),lx.forEach(IH)}function x6(w,v){w.blockedOn===v&&(w.blockedOn=null,wG||(wG=!0,_0.unstable_scheduleCallback(_0.unstable_NormalPriority,vK)))}function bH(w){J8!==w&&(J8=w,_0.unstable_scheduleCallback(_0.unstable_NormalPriority,function(){J8===w&&(J8=null);for(var v=0;v<w.length;v+=3){var g=w[v],x=w[v+1],z=w[v+2];if(typeof x!=="function")if(R9(x||g)===null)continue;else break;var G=$0(g);G!==null&&(w.splice(v,3),v-=3,g={pending:!0,data:z,method:g.method,action:x},Object.freeze(g),R7(G,g,x,z))}}))}function Ig(w){function v(X){return x6(X,w)}e5!==null&&x6(e5,w),wv!==null&&x6(wv,w),vv!==null&&x6(vv,w),ux.forEach(v),lx.forEach(v);for(var g=0;g<gv.length;g++){var x=gv[g];x.blockedOn===w&&(x.blockedOn=null)}for(;0<gv.length&&(g=gv[0],g.blockedOn===null);)LH(g),g.blockedOn===null&&gv.shift();if(g=(w.ownerDocument||w).$$reactFormReplay,g!=null)for(x=0;x<g.length;x+=3){var z=g[x],G=g[x+1],Z=z[sw]||null;if(typeof G==="function")Z||bH(g);else if(Z){var B=null;if(G&&G.hasAttribute("formAction")){if(z=G,Z=G[sw]||null)B=Z.formAction;else if(R9(z)!==null)continue}else B=Z.action;typeof B==="function"?g[x+1]=B:(g.splice(x,3),x-=3),bH(g)}}}function jH(){function w(G){G.canIntercept&&G.info==="react-transition"&&G.intercept({handler:function(){return new Promise(function(Z){return z=Z})},focusReset:"manual",scroll:"manual"})}function v(){z!==null&&(z(),z=null),x||setTimeout(g,20)}function g(){if(!x&&!navigation.transition){var G=navigation.currentEntry;G&&G.url!=null&&navigation.navigate(G.url,{state:G.getState(),info:"react-transition",history:"replace"})}}if(typeof navigation==="object"){var x=!1,z=null;return navigation.addEventListener("navigate",w),navigation.addEventListener("navigatesuccess",v),navigation.addEventListener("navigateerror",v),setTimeout(g,100),function(){x=!0,navigation.removeEventListener("navigate",w),navigation.removeEventListener("navigatesuccess",v),navigation.removeEventListener("navigateerror",v),z!==null&&(z(),z=null)}}}function V9(w){this._internalRoot=w}function z6(w){this._internalRoot=w}function AH(w){w[C5]&&(w._reactRootContainer?console.error("You are calling ReactDOMClient.createRoot() on a container that was previously passed to ReactDOM.render(). This is not supported."):console.error("You are calling ReactDOMClient.createRoot() on a container that has already been passed to createRoot() before. Instead, call root.render() on the existing root instead if you want to update it."))}typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart==="function"&&__REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());var O0=Object.assign,gK=Symbol.for("react.element"),F1=Symbol.for("react.transitional.element"),bg=Symbol.for("react.portal"),jg=Symbol.for("react.fragment"),G6=Symbol.for("react.strict_mode"),D9=Symbol.for("react.profiler"),k9=Symbol.for("react.consumer"),h1=Symbol.for("react.context"),r4=Symbol.for("react.forward_ref"),F9=Symbol.for("react.suspense"),h9=Symbol.for("react.suspense_list"),Z6=Symbol.for("react.memo"),A2=Symbol.for("react.lazy"),P9=Symbol.for("react.activity"),xK=Symbol.for("react.memo_cache_sentinel"),OH=Symbol.iterator,zK=Symbol.for("react.client.reference"),Ow=Array.isArray,k=z4.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,d0=gG.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,GK=Object.freeze({pending:!1,data:null,method:null,action:null}),C9=[],_9=[],o1=-1,F5=xw(null),n4=xw(null),h5=xw(null),B6=xw(null),o4=0,RH,VH,DH,kH,FH,hH,PH;V.__reactDisabledLog=!0;var f9,CH,E9=!1,N9=new(typeof WeakMap==="function"?WeakMap:Map),O2=null,P1=!1,v1=Object.prototype.hasOwnProperty,S9=_0.unstable_scheduleCallback,ZK=_0.unstable_cancelCallback,BK=_0.unstable_shouldYield,XK=_0.unstable_requestPaint,kw=_0.unstable_now,HK=_0.unstable_getCurrentPriorityLevel,d9=_0.unstable_ImmediatePriority,T9=_0.unstable_UserBlockingPriority,Ag=_0.unstable_NormalPriority,JK=_0.unstable_LowPriority,m9=_0.unstable_IdlePriority,QK=_0.log,$K=_0.unstable_setDisableYieldValue,Og=null,mw=null,C1=!1,_1=typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u",cw=Math.clz32?Math.clz32:nx,qK=Math.log,UK=Math.LN2,X6=256,H6=262144,J6=4194304,R2=2,g1=8,f1=32,Q6=268435456,P5=Math.random().toString(36).slice(2),Nw="__reactFiber$"+P5,sw="__reactProps$"+P5,C5="__reactContainer$"+P5,u9="__reactEvents$"+P5,KK="__reactListeners$"+P5,WK="__reactHandles$"+P5,_H="__reactResources$"+P5,t4="__reactMarker$"+P5,fH=new Set,kv={},l9={},MK={button:!0,checkbox:!0,image:!0,hidden:!0,radio:!0,reset:!0,submit:!0},YK=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),EH={},NH={},LK=/[\n"\\]/g,SH=!1,dH=!1,TH=!1,mH=!1,uH=!1,lH=!1,yH=["value","defaultValue"],aH=!1,cH=/["'&<>\n\t]|^\s|\s$/,IK="address applet area article aside base basefont bgsound blockquote body br button caption center col colgroup dd details dir div dl dt embed fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hgroup hr html iframe img input isindex li link listing main marquee menu menuitem meta nav noembed noframes noscript object ol p param plaintext pre script section select source style summary table tbody td template textarea tfoot th thead title tr track ul wbr xmp".split(" "),sH="applet caption html table td th marquee object template foreignObject desc title".split(" "),bK=sH.concat(["button"]),jK="dd dt li option optgroup p rp rt".split(" "),iH={current:null,formTag:null,aTagInScope:null,buttonTagInScope:null,nobrTagInScope:null,pTagInButtonScope:null,listItemTagAutoclosing:null,dlItemTagAutoclosing:null,containerTagInScope:null,implicitRootScope:!1},$6={},y9={animation:"animationDelay animationDirection animationDuration animationFillMode animationIterationCount animationName animationPlayState animationTimingFunction".split(" "),background:"backgroundAttachment backgroundClip backgroundColor backgroundImage backgroundOrigin backgroundPositionX backgroundPositionY backgroundRepeat backgroundSize".split(" "),backgroundPosition:["backgroundPositionX","backgroundPositionY"],border:"borderBottomColor borderBottomStyle borderBottomWidth borderImageOutset borderImageRepeat borderImageSlice borderImageSource borderImageWidth borderLeftColor borderLeftStyle borderLeftWidth borderRightColor borderRightStyle borderRightWidth borderTopColor borderTopStyle borderTopWidth".split(" "),borderBlockEnd:["borderBlockEndColor","borderBlockEndStyle","borderBlockEndWidth"],borderBlockStart:["borderBlockStartColor","borderBlockStartStyle","borderBlockStartWidth"],borderBottom:["borderBottomColor","borderBottomStyle","borderBottomWidth"],borderColor:["borderBottomColor","borderLeftColor","borderRightColor","borderTopColor"],borderImage:["borderImageOutset","borderImageRepeat","borderImageSlice","borderImageSource","borderImageWidth"],borderInlineEnd:["borderInlineEndColor","borderInlineEndStyle","borderInlineEndWidth"],borderInlineStart:["borderInlineStartColor","borderInlineStartStyle","borderInlineStartWidth"],borderLeft:["borderLeftColor","borderLeftStyle","borderLeftWidth"],borderRadius:["borderBottomLeftRadius","borderBottomRightRadius","borderTopLeftRadius","borderTopRightRadius"],borderRight:["borderRightColor","borderRightStyle","borderRightWidth"],borderStyle:["borderBottomStyle","borderLeftStyle","borderRightStyle","borderTopStyle"],borderTop:["borderTopColor","borderTopStyle","borderTopWidth"],borderWidth:["borderBottomWidth","borderLeftWidth","borderRightWidth","borderTopWidth"],columnRule:["columnRuleColor","columnRuleStyle","columnRuleWidth"],columns:["columnCount","columnWidth"],flex:["flexBasis","flexGrow","flexShrink"],flexFlow:["flexDirection","flexWrap"],font:"fontFamily fontFeatureSettings fontKerning fontLanguageOverride fontSize fontSizeAdjust fontStretch fontStyle fontVariant fontVariantAlternates fontVariantCaps fontVariantEastAsian fontVariantLigatures fontVariantNumeric fontVariantPosition fontWeight lineHeight".split(" "),fontVariant:"fontVariantAlternates fontVariantCaps fontVariantEastAsian fontVariantLigatures fontVariantNumeric fontVariantPosition".split(" "),gap:["columnGap","rowGap"],grid:"gridAutoColumns gridAutoFlow gridAutoRows gridTemplateAreas gridTemplateColumns gridTemplateRows".split(" "),gridArea:["gridColumnEnd","gridColumnStart","gridRowEnd","gridRowStart"],gridColumn:["gridColumnEnd","gridColumnStart"],gridColumnGap:["columnGap"],gridGap:["columnGap","rowGap"],gridRow:["gridRowEnd","gridRowStart"],gridRowGap:["rowGap"],gridTemplate:["gridTemplateAreas","gridTemplateColumns","gridTemplateRows"],listStyle:["listStyleImage","listStylePosition","listStyleType"],margin:["marginBottom","marginLeft","marginRight","marginTop"],marker:["markerEnd","markerMid","markerStart"],mask:"maskClip maskComposite maskImage maskMode maskOrigin maskPositionX maskPositionY maskRepeat maskSize".split(" "),maskPosition:["maskPositionX","maskPositionY"],outline:["outlineColor","outlineStyle","outlineWidth"],overflow:["overflowX","overflowY"],padding:["paddingBottom","paddingLeft","paddingRight","paddingTop"],placeContent:["alignContent","justifyContent"],placeItems:["alignItems","justifyItems"],placeSelf:["alignSelf","justifySelf"],textDecoration:["textDecorationColor","textDecorationLine","textDecorationStyle"],textEmphasis:["textEmphasisColor","textEmphasisStyle"],transition:["transitionDelay","transitionDuration","transitionProperty","transitionTimingFunction"],wordWrap:["overflowWrap"]},rH=/([A-Z])/g,nH=/^ms-/,AK=/^(?:webkit|moz|o)[A-Z]/,OK=/^-ms-/,RK=/-(.)/g,oH=/;\s*$/,Rg={},a9={},tH=!1,pH=!1,eH=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" ")),q6="http://www.w3.org/1998/Math/MathML",Vg="http://www.w3.org/2000/svg",VK=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),U6={accept:"accept",acceptcharset:"acceptCharset","accept-charset":"acceptCharset",accesskey:"accessKey",action:"action",allowfullscreen:"allowFullScreen",alt:"alt",as:"as",async:"async",autocapitalize:"autoCapitalize",autocomplete:"autoComplete",autocorrect:"autoCorrect",autofocus:"autoFocus",autoplay:"autoPlay",autosave:"autoSave",capture:"capture",cellpadding:"cellPadding",cellspacing:"cellSpacing",challenge:"challenge",charset:"charSet",checked:"checked",children:"children",cite:"cite",class:"className",classid:"classID",classname:"className",cols:"cols",colspan:"colSpan",content:"content",contenteditable:"contentEditable",contextmenu:"contextMenu",controls:"controls",controlslist:"controlsList",coords:"coords",crossorigin:"crossOrigin",dangerouslysetinnerhtml:"dangerouslySetInnerHTML",data:"data",datetime:"dateTime",default:"default",defaultchecked:"defaultChecked",defaultvalue:"defaultValue",defer:"defer",dir:"dir",disabled:"disabled",disablepictureinpicture:"disablePictureInPicture",disableremoteplayback:"disableRemotePlayback",download:"download",draggable:"draggable",enctype:"encType",enterkeyhint:"enterKeyHint",fetchpriority:"fetchPriority",for:"htmlFor",form:"form",formmethod:"formMethod",formaction:"formAction",formenctype:"formEncType",formnovalidate:"formNoValidate",formtarget:"formTarget",frameborder:"frameBorder",headers:"headers",height:"height",hidden:"hidden",high:"high",href:"href",hreflang:"hrefLang",htmlfor:"htmlFor",httpequiv:"httpEquiv","http-equiv":"httpEquiv",icon:"icon",id:"id",imagesizes:"imageSizes",imagesrcset:"imageSrcSet",inert:"inert",innerhtml:"innerHTML",inputmode:"inputMode",integrity:"integrity",is:"is",itemid:"itemID",itemprop:"itemProp",itemref:"itemRef",itemscope:"itemScope",itemtype:"itemType",keyparams:"keyParams",keytype:"keyType",kind:"kind",label:"label",lang:"lang",list:"list",loop:"loop",low:"low",manifest:"manifest",marginwidth:"marginWidth",marginheight:"marginHeight",max:"max",maxlength:"maxLength",media:"media",mediagroup:"mediaGroup",method:"method",min:"min",minlength:"minLength",multiple:"multiple",muted:"muted",name:"name",nomodule:"noModule",nonce:"nonce",novalidate:"noValidate",open:"open",optimum:"optimum",pattern:"pattern",placeholder:"placeholder",playsinline:"playsInline",poster:"poster",preload:"preload",profile:"profile",radiogroup:"radioGroup",readonly:"readOnly",referrerpolicy:"referrerPolicy",rel:"rel",required:"required",reversed:"reversed",role:"role",rows:"rows",rowspan:"rowSpan",sandbox:"sandbox",scope:"scope",scoped:"scoped",scrolling:"scrolling",seamless:"seamless",selected:"selected",shape:"shape",size:"size",sizes:"sizes",span:"span",spellcheck:"spellCheck",src:"src",srcdoc:"srcDoc",srclang:"srcLang",srcset:"srcSet",start:"start",step:"step",style:"style",summary:"summary",tabindex:"tabIndex",target:"target",title:"title",type:"type",usemap:"useMap",value:"value",width:"width",wmode:"wmode",wrap:"wrap",about:"about",accentheight:"accentHeight","accent-height":"accentHeight",accumulate:"accumulate",additive:"additive",alignmentbaseline:"alignmentBaseline","alignment-baseline":"alignmentBaseline",allowreorder:"allowReorder",alphabetic:"alphabetic",amplitude:"amplitude",arabicform:"arabicForm","arabic-form":"arabicForm",ascent:"ascent",attributename:"attributeName",attributetype:"attributeType",autoreverse:"autoReverse",azimuth:"azimuth",basefrequency:"baseFrequency",baselineshift:"baselineShift","baseline-shift":"baselineShift",baseprofile:"baseProfile",bbox:"bbox",begin:"begin",bias:"bias",by:"by",calcmode:"calcMode",capheight:"capHeight","cap-height":"capHeight",clip:"clip",clippath:"clipPath","clip-path":"clipPath",clippathunits:"clipPathUnits",cliprule:"clipRule","clip-rule":"clipRule",color:"color",colorinterpolation:"colorInterpolation","color-interpolation":"colorInterpolation",colorinterpolationfilters:"colorInterpolationFilters","color-interpolation-filters":"colorInterpolationFilters",colorprofile:"colorProfile","color-profile":"colorProfile",colorrendering:"colorRendering","color-rendering":"colorRendering",contentscripttype:"contentScriptType",contentstyletype:"contentStyleType",cursor:"cursor",cx:"cx",cy:"cy",d:"d",datatype:"datatype",decelerate:"decelerate",descent:"descent",diffuseconstant:"diffuseConstant",direction:"direction",display:"display",divisor:"divisor",dominantbaseline:"dominantBaseline","dominant-baseline":"dominantBaseline",dur:"dur",dx:"dx",dy:"dy",edgemode:"edgeMode",elevation:"elevation",enablebackground:"enableBackground","enable-background":"enableBackground",end:"end",exponent:"exponent",externalresourcesrequired:"externalResourcesRequired",fill:"fill",fillopacity:"fillOpacity","fill-opacity":"fillOpacity",fillrule:"fillRule","fill-rule":"fillRule",filter:"filter",filterres:"filterRes",filterunits:"filterUnits",floodopacity:"floodOpacity","flood-opacity":"floodOpacity",floodcolor:"floodColor","flood-color":"floodColor",focusable:"focusable",fontfamily:"fontFamily","font-family":"fontFamily",fontsize:"fontSize","font-size":"fontSize",fontsizeadjust:"fontSizeAdjust","font-size-adjust":"fontSizeAdjust",fontstretch:"fontStretch","font-stretch":"fontStretch",fontstyle:"fontStyle","font-style":"fontStyle",fontvariant:"fontVariant","font-variant":"fontVariant",fontweight:"fontWeight","font-weight":"fontWeight",format:"format",from:"from",fx:"fx",fy:"fy",g1:"g1",g2:"g2",glyphname:"glyphName","glyph-name":"glyphName",glyphorientationhorizontal:"glyphOrientationHorizontal","glyph-orientation-horizontal":"glyphOrientationHorizontal",glyphorientationvertical:"glyphOrientationVertical","glyph-orientation-vertical":"glyphOrientationVertical",glyphref:"glyphRef",gradienttransform:"gradientTransform",gradientunits:"gradientUnits",hanging:"hanging",horizadvx:"horizAdvX","horiz-adv-x":"horizAdvX",horizoriginx:"horizOriginX","horiz-origin-x":"horizOriginX",ideographic:"ideographic",imagerendering:"imageRendering","image-rendering":"imageRendering",in2:"in2",in:"in",inlist:"inlist",intercept:"intercept",k1:"k1",k2:"k2",k3:"k3",k4:"k4",k:"k",kernelmatrix:"kernelMatrix",kernelunitlength:"kernelUnitLength",kerning:"kerning",keypoints:"keyPoints",keysplines:"keySplines",keytimes:"keyTimes",lengthadjust:"lengthAdjust",letterspacing:"letterSpacing","letter-spacing":"letterSpacing",lightingcolor:"lightingColor","lighting-color":"lightingColor",limitingconeangle:"limitingConeAngle",local:"local",markerend:"markerEnd","marker-end":"markerEnd",markerheight:"markerHeight",markermid:"markerMid","marker-mid":"markerMid",markerstart:"markerStart","marker-start":"markerStart",markerunits:"markerUnits",markerwidth:"markerWidth",mask:"mask",maskcontentunits:"maskContentUnits",maskunits:"maskUnits",mathematical:"mathematical",mode:"mode",numoctaves:"numOctaves",offset:"offset",opacity:"opacity",operator:"operator",order:"order",orient:"orient",orientation:"orientation",origin:"origin",overflow:"overflow",overlineposition:"overlinePosition","overline-position":"overlinePosition",overlinethickness:"overlineThickness","overline-thickness":"overlineThickness",paintorder:"paintOrder","paint-order":"paintOrder",panose1:"panose1","panose-1":"panose1",pathlength:"pathLength",patterncontentunits:"patternContentUnits",patterntransform:"patternTransform",patternunits:"patternUnits",pointerevents:"pointerEvents","pointer-events":"pointerEvents",points:"points",pointsatx:"pointsAtX",pointsaty:"pointsAtY",pointsatz:"pointsAtZ",popover:"popover",popovertarget:"popoverTarget",popovertargetaction:"popoverTargetAction",prefix:"prefix",preservealpha:"preserveAlpha",preserveaspectratio:"preserveAspectRatio",primitiveunits:"primitiveUnits",property:"property",r:"r",radius:"radius",refx:"refX",refy:"refY",renderingintent:"renderingIntent","rendering-intent":"renderingIntent",repeatcount:"repeatCount",repeatdur:"repeatDur",requiredextensions:"requiredExtensions",requiredfeatures:"requiredFeatures",resource:"resource",restart:"restart",result:"result",results:"results",rotate:"rotate",rx:"rx",ry:"ry",scale:"scale",security:"security",seed:"seed",shaperendering:"shapeRendering","shape-rendering":"shapeRendering",slope:"slope",spacing:"spacing",specularconstant:"specularConstant",specularexponent:"specularExponent",speed:"speed",spreadmethod:"spreadMethod",startoffset:"startOffset",stddeviation:"stdDeviation",stemh:"stemh",stemv:"stemv",stitchtiles:"stitchTiles",stopcolor:"stopColor","stop-color":"stopColor",stopopacity:"stopOpacity","stop-opacity":"stopOpacity",strikethroughposition:"strikethroughPosition","strikethrough-position":"strikethroughPosition",strikethroughthickness:"strikethroughThickness","strikethrough-thickness":"strikethroughThickness",string:"string",stroke:"stroke",strokedasharray:"strokeDasharray","stroke-dasharray":"strokeDasharray",strokedashoffset:"strokeDashoffset","stroke-dashoffset":"strokeDashoffset",strokelinecap:"strokeLinecap","stroke-linecap":"strokeLinecap",strokelinejoin:"strokeLinejoin","stroke-linejoin":"strokeLinejoin",strokemiterlimit:"strokeMiterlimit","stroke-miterlimit":"strokeMiterlimit",strokewidth:"strokeWidth","stroke-width":"strokeWidth",strokeopacity:"strokeOpacity","stroke-opacity":"strokeOpacity",suppresscontenteditablewarning:"suppressContentEditableWarning",suppresshydrationwarning:"suppressHydrationWarning",surfacescale:"surfaceScale",systemlanguage:"systemLanguage",tablevalues:"tableValues",targetx:"targetX",targety:"targetY",textanchor:"textAnchor","text-anchor":"textAnchor",textdecoration:"textDecoration","text-decoration":"textDecoration",textlength:"textLength",textrendering:"textRendering","text-rendering":"textRendering",to:"to",transform:"transform",transformorigin:"transformOrigin","transform-origin":"transformOrigin",typeof:"typeof",u1:"u1",u2:"u2",underlineposition:"underlinePosition","underline-position":"underlinePosition",underlinethickness:"underlineThickness","underline-thickness":"underlineThickness",unicode:"unicode",unicodebidi:"unicodeBidi","unicode-bidi":"unicodeBidi",unicoderange:"unicodeRange","unicode-range":"unicodeRange",unitsperem:"unitsPerEm","units-per-em":"unitsPerEm",unselectable:"unselectable",valphabetic:"vAlphabetic","v-alphabetic":"vAlphabetic",values:"values",vectoreffect:"vectorEffect","vector-effect":"vectorEffect",version:"version",vertadvy:"vertAdvY","vert-adv-y":"vertAdvY",vertoriginx:"vertOriginX","vert-origin-x":"vertOriginX",vertoriginy:"vertOriginY","vert-origin-y":"vertOriginY",vhanging:"vHanging","v-hanging":"vHanging",videographic:"vIdeographic","v-ideographic":"vIdeographic",viewbox:"viewBox",viewtarget:"viewTarget",visibility:"visibility",vmathematical:"vMathematical","v-mathematical":"vMathematical",vocab:"vocab",widths:"widths",wordspacing:"wordSpacing","word-spacing":"wordSpacing",writingmode:"writingMode","writing-mode":"writingMode",x1:"x1",x2:"x2",x:"x",xchannelselector:"xChannelSelector",xheight:"xHeight","x-height":"xHeight",xlinkactuate:"xlinkActuate","xlink:actuate":"xlinkActuate",xlinkarcrole:"xlinkArcrole","xlink:arcrole":"xlinkArcrole",xlinkhref:"xlinkHref","xlink:href":"xlinkHref",xlinkrole:"xlinkRole","xlink:role":"xlinkRole",xlinkshow:"xlinkShow","xlink:show":"xlinkShow",xlinktitle:"xlinkTitle","xlink:title":"xlinkTitle",xlinktype:"xlinkType","xlink:type":"xlinkType",xmlbase:"xmlBase","xml:base":"xmlBase",xmllang:"xmlLang","xml:lang":"xmlLang",xmlns:"xmlns","xml:space":"xmlSpace",xmlnsxlink:"xmlnsXlink","xmlns:xlink":"xmlnsXlink",xmlspace:"xmlSpace",y1:"y1",y2:"y2",y:"y",ychannelselector:"yChannelSelector",z:"z",zoomandpan:"zoomAndPan"},wJ={"aria-current":0,"aria-description":0,"aria-details":0,"aria-disabled":0,"aria-hidden":0,"aria-invalid":0,"aria-keyshortcuts":0,"aria-label":0,"aria-roledescription":0,"aria-autocomplete":0,"aria-checked":0,"aria-expanded":0,"aria-haspopup":0,"aria-level":0,"aria-modal":0,"aria-multiline":0,"aria-multiselectable":0,"aria-orientation":0,"aria-placeholder":0,"aria-pressed":0,"aria-readonly":0,"aria-required":0,"aria-selected":0,"aria-sort":0,"aria-valuemax":0,"aria-valuemin":0,"aria-valuenow":0,"aria-valuetext":0,"aria-atomic":0,"aria-busy":0,"aria-live":0,"aria-relevant":0,"aria-dropeffect":0,"aria-grabbed":0,"aria-activedescendant":0,"aria-colcount":0,"aria-colindex":0,"aria-colspan":0,"aria-controls":0,"aria-describedby":0,"aria-errormessage":0,"aria-flowto":0,"aria-labelledby":0,"aria-owns":0,"aria-posinset":0,"aria-rowcount":0,"aria-rowindex":0,"aria-rowspan":0,"aria-setsize":0,"aria-braillelabel":0,"aria-brailleroledescription":0,"aria-colindextext":0,"aria-rowindextext":0},Dg={},DK=RegExp("^(aria)-[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),kK=RegExp("^(aria)[A-Z][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),vJ=!1,iw={},gJ=/^on./,FK=/^on[^A-Z]/,hK=RegExp("^(aria)-[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),PK=RegExp("^(aria)[A-Z][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),CK=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i,p4=null,kg=null,Fg=null,c9=!1,E1=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),s9=!1;if(E1)try{var e4={};Object.defineProperty(e4,"passive",{get:function(){s9=!0}}),window.addEventListener("test",e4,e4),window.removeEventListener("test",e4,e4)}catch(w){s9=!1}var _5=null,i9=null,K6=null,Fv={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(w){return w.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},W6=G2(Fv),wx=O0({},Fv,{view:0,detail:0}),_K=G2(wx),r9,n9,vx,M6=O0({},wx,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:P8,button:0,buttons:0,relatedTarget:function(w){return w.relatedTarget===void 0?w.fromElement===w.srcElement?w.toElement:w.fromElement:w.relatedTarget},movementX:function(w){if("movementX"in w)return w.movementX;return w!==vx&&(vx&&w.type==="mousemove"?(r9=w.screenX-vx.screenX,n9=w.screenY-vx.screenY):n9=r9=0,vx=w),r9},movementY:function(w){return"movementY"in w?w.movementY:n9}}),xJ=G2(M6),fK=O0({},M6,{dataTransfer:0}),EK=G2(fK),NK=O0({},wx,{relatedTarget:0}),o9=G2(NK),SK=O0({},Fv,{animationName:0,elapsedTime:0,pseudoElement:0}),dK=G2(SK),TK=O0({},Fv,{clipboardData:function(w){return"clipboardData"in w?w.clipboardData:window.clipboardData}}),mK=G2(TK),uK=O0({},Fv,{data:0}),zJ=G2(uK),lK=zJ,yK={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},aK={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},cK={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"},sK=O0({},wx,{key:function(w){if(w.key){var v=yK[w.key]||w.key;if(v!=="Unidentified")return v}return w.type==="keypress"?(w=g3(w),w===13?"Enter":String.fromCharCode(w)):w.type==="keydown"||w.type==="keyup"?aK[w.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:P8,charCode:function(w){return w.type==="keypress"?g3(w):0},keyCode:function(w){return w.type==="keydown"||w.type==="keyup"?w.keyCode:0},which:function(w){return w.type==="keypress"?g3(w):w.type==="keydown"||w.type==="keyup"?w.keyCode:0}}),iK=G2(sK),rK=O0({},M6,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),GJ=G2(rK),nK=O0({},wx,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:P8}),oK=G2(nK),tK=O0({},Fv,{propertyName:0,elapsedTime:0,pseudoElement:0}),pK=G2(tK),eK=O0({},M6,{deltaX:function(w){return"deltaX"in w?w.deltaX:("wheelDeltaX"in w)?-w.wheelDeltaX:0},deltaY:function(w){return"deltaY"in w?w.deltaY:("wheelDeltaY"in w)?-w.wheelDeltaY:("wheelDelta"in w)?-w.wheelDelta:0},deltaZ:0,deltaMode:0}),wW=G2(eK),vW=O0({},Fv,{newState:0,oldState:0}),gW=G2(vW),xW=[9,13,27,32],ZJ=229,t9=E1&&"CompositionEvent"in window,gx=null;E1&&"documentMode"in document&&(gx=document.documentMode);var zW=E1&&"TextEvent"in window&&!gx,BJ=E1&&(!t9||gx&&8<gx&&11>=gx),XJ=32,HJ=String.fromCharCode(XJ),JJ=!1,hg=!1,GW={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0},xx=null,zx=null,QJ=!1;E1&&(QJ=Vq("input")&&(!document.documentMode||9<document.documentMode));var rw=typeof Object.is==="function"?Object.is:Cq,ZW=E1&&"documentMode"in document&&11>=document.documentMode,Pg=null,p9=null,Gx=null,e9=!1,Cg={animationend:Uv("Animation","AnimationEnd"),animationiteration:Uv("Animation","AnimationIteration"),animationstart:Uv("Animation","AnimationStart"),transitionrun:Uv("Transition","TransitionRun"),transitionstart:Uv("Transition","TransitionStart"),transitioncancel:Uv("Transition","TransitionCancel"),transitionend:Uv("Transition","TransitionEnd")},wz={},$J={};E1&&($J=document.createElement("div").style,("AnimationEvent"in window)||(delete Cg.animationend.animation,delete Cg.animationiteration.animation,delete Cg.animationstart.animation),("TransitionEvent"in window)||delete Cg.transitionend.transition);var qJ=Kv("animationend"),UJ=Kv("animationiteration"),KJ=Kv("animationstart"),BW=Kv("transitionrun"),XW=Kv("transitionstart"),HW=Kv("transitioncancel"),WJ=Kv("transitionend"),MJ=new Map,vz="abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");vz.push("scrollEnd");var YJ=0;if(typeof performance==="object"&&typeof performance.now==="function")var JW=performance,LJ=function(){return JW.now()};else{var QW=Date;LJ=function(){return QW.now()}}var gz=typeof reportError==="function"?reportError:function(w){if(typeof window==="object"&&typeof window.ErrorEvent==="function"){var v=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof w==="object"&&w!==null&&typeof w.message==="string"?String(w.message):String(w),error:w});if(!window.dispatchEvent(v))return}else if(typeof process==="object"&&typeof process.emit==="function"){process.emit("uncaughtException",w);return}console.error(w)},$W="This object has been omitted by React in the console log to avoid sending too much data from the server. Try logging smaller or more specific objects.",Y6=0,xz=1,zz=2,Gz=3,L6="– ",I6="+ ",IJ="  ",t0=typeof console<"u"&&typeof console.timeStamp==="function"&&typeof performance<"u"&&typeof performance.measure==="function",N2="Components ⚛",R0="Scheduler ⚛",V0="Blocking",f5=!1,t1={color:"primary",properties:null,tooltipText:"",track:N2},E5={start:-0,end:-0,detail:{devtools:t1}},qW=["Changed Props",""],bJ="This component received deeply equal props. It might benefit from useMemo or the React Compiler in its owner.",UW=["Changed Props",bJ],Zx=1,p1=2,S2=[],_g=0,Zz=0,N5={};Object.freeze(N5);var d2=null,fg=null,B0=0,KW=1,Y0=2,uw=8,x1=16,WW=32,jJ=!1;try{var AJ=Object.preventExtensions({});}catch(w){jJ=!0}var Bz=new WeakMap,Eg=[],Ng=0,b6=null,Bx=0,T2=[],m2=0,hv=null,e1=1,w5="",Sw=null,p0=null,D0=!1,N1=!1,V2=null,S5=null,u2=!1,Xz=Error("Hydration Mismatch Exception: This is not a real error, and should not leak into userspace. If you're seeing this, it's likely a bug in React."),Hz=xw(null),Jz=xw(null),OJ={},j6=null,Sg=null,dg=!1,MW=typeof AbortController<"u"?AbortController:function(){var w=[],v=this.signal={aborted:!1,addEventListener:function(g,x){w.push(x)}};this.abort=function(){v.aborted=!0,w.forEach(function(g){return g()})}},YW=_0.unstable_scheduleCallback,LW=_0.unstable_NormalPriority,Ww={$$typeof:h1,Consumer:null,Provider:null,_currentValue:null,_currentValue2:null,_threadCount:0,_currentRenderer:null,_currentRenderer2:null},Mw=_0.unstable_now,A6=console.createTask?console.createTask:function(){return null},Xx=1,O6=2,Fw=-0,d5=-0,v5=-0,g5=null,nw=-1.1,Pv=-0,zw=-0,G0=-1.1,Z0=-1.1,vw=null,Xw=!1,T5=-0,S1=-1.1,Hx=null,m5=0,Qz=null,$z=null,Cv=-1.1,Jx=null,Tg=-1.1,R6=-1.1,d1=-0,x5=-1.1,l2=-1.1,qz=0,Qx=null,RJ=null,VJ=null,u5=-1.1,_v=null,l5=-1.1,V6=-1.1,DJ=-0,kJ=-0,D6=0,z5=null,FJ=0,$x=-1.1,k6=!1,F6=!1,qx=null,Uz=0,fv=0,mg=null,hJ=k.S;k.S=function(w,v){if(RQ=kw(),typeof v==="object"&&v!==null&&typeof v.then==="function"){if(0>x5&&0>l2){x5=Mw();var g=y4(),x=l4();if(g!==l5||x!==_v)l5=-1.1;u5=g,_v=x}Tq(w,v)}hJ!==null&&hJ(w,v)};var Ev=xw(null),z1={recordUnsafeLifecycleWarnings:function(){},flushPendingUnsafeLifecycleWarnings:function(){},recordLegacyContextWarning:function(){},flushLegacyContextWarning:function(){},discardPendingWarnings:function(){}},Ux=[],Kx=[],Wx=[],Mx=[],Yx=[],Lx=[],Nv=new Set;z1.recordUnsafeLifecycleWarnings=function(w,v){Nv.has(w.type)||(typeof v.componentWillMount==="function"&&v.componentWillMount.__suppressDeprecationWarning!==!0&&Ux.push(w),w.mode&uw&&typeof v.UNSAFE_componentWillMount==="function"&&Kx.push(w),typeof v.componentWillReceiveProps==="function"&&v.componentWillReceiveProps.__suppressDeprecationWarning!==!0&&Wx.push(w),w.mode&uw&&typeof v.UNSAFE_componentWillReceiveProps==="function"&&Mx.push(w),typeof v.componentWillUpdate==="function"&&v.componentWillUpdate.__suppressDeprecationWarning!==!0&&Yx.push(w),w.mode&uw&&typeof v.UNSAFE_componentWillUpdate==="function"&&Lx.push(w))},z1.flushPendingUnsafeLifecycleWarnings=function(){var w=new Set;0<Ux.length&&(Ux.forEach(function(B){w.add(l(B)||"Component"),Nv.add(B.type)}),Ux=[]);var v=new Set;0<Kx.length&&(Kx.forEach(function(B){v.add(l(B)||"Component"),Nv.add(B.type)}),Kx=[]);var g=new Set;0<Wx.length&&(Wx.forEach(function(B){g.add(l(B)||"Component"),Nv.add(B.type)}),Wx=[]);var x=new Set;0<Mx.length&&(Mx.forEach(function(B){x.add(l(B)||"Component"),Nv.add(B.type)}),Mx=[]);var z=new Set;0<Yx.length&&(Yx.forEach(function(B){z.add(l(B)||"Component"),Nv.add(B.type)}),Yx=[]);var G=new Set;if(0<Lx.length&&(Lx.forEach(function(B){G.add(l(B)||"Component"),Nv.add(B.type)}),Lx=[]),0<v.size){var Z=j(v);console.error(`Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code with side effects to componentDidMount, and set initial state in the constructor.

Please update the following components: %s`,Z)}0<x.size&&(Z=j(x),console.error(`Using UNSAFE_componentWillReceiveProps in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* If you're updating state whenever props change, refactor your code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state

Please update the following components: %s`,Z)),0<G.size&&(Z=j(G),console.error(`Using UNSAFE_componentWillUpdate in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.

Please update the following components: %s`,Z)),0<w.size&&(Z=j(w),console.warn(`componentWillMount has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code with side effects to componentDidMount, and set initial state in the constructor.
* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: %s`,Z)),0<g.size&&(Z=j(g),console.warn(`componentWillReceiveProps has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* If you're updating state whenever props change, refactor your code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state
* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: %s`,Z)),0<z.size&&(Z=j(z),console.warn(`componentWillUpdate has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: %s`,Z))};var h6=new Map,PJ=new Set;z1.recordLegacyContextWarning=function(w,v){var g=null;for(var x=w;x!==null;)x.mode&uw&&(g=x),x=x.return;g===null?console.error("Expected to find a StrictMode component in a strict mode tree. This error is likely caused by a bug in React. Please file an issue."):!PJ.has(w.type)&&(x=h6.get(g),w.type.contextTypes!=null||w.type.childContextTypes!=null||v!==null&&typeof v.getChildContext==="function")&&(x===void 0&&(x=[],h6.set(g,x)),x.push(w))},z1.flushLegacyContextWarning=function(){h6.forEach(function(w){if(w.length!==0){var v=w[0],g=new Set;w.forEach(function(z){g.add(l(z)||"Component"),PJ.add(z.type)});var x=j(g);n(v,function(){console.error(`Legacy context API has been detected within a strict-mode tree.

The old API will be supported in all 16.x releases, but applications using it should migrate to the new version.

Please update the following components: %s

Learn more about this warning here: https://react.dev/link/legacy-context`,x)})}})},z1.discardPendingWarnings=function(){Ux=[],Kx=[],Wx=[],Mx=[],Yx=[],Lx=[],h6=new Map};var CJ={react_stack_bottom_frame:function(w,v,g){var x=P1;P1=!0;try{return w(v,g)}finally{P1=x}}},Kz=CJ.react_stack_bottom_frame.bind(CJ),_J={react_stack_bottom_frame:function(w){var v=P1;P1=!0;try{return w.render()}finally{P1=v}}},fJ=_J.react_stack_bottom_frame.bind(_J),EJ={react_stack_bottom_frame:function(w,v){try{v.componentDidMount()}catch(g){S0(w,w.return,g)}}},Wz=EJ.react_stack_bottom_frame.bind(EJ),NJ={react_stack_bottom_frame:function(w,v,g,x,z){try{v.componentDidUpdate(g,x,z)}catch(G){S0(w,w.return,G)}}},SJ=NJ.react_stack_bottom_frame.bind(NJ),dJ={react_stack_bottom_frame:function(w,v){var g=v.stack;w.componentDidCatch(v.value,{componentStack:g!==null?g:""})}},IW=dJ.react_stack_bottom_frame.bind(dJ),TJ={react_stack_bottom_frame:function(w,v,g){try{g.componentWillUnmount()}catch(x){S0(w,v,x)}}},mJ=TJ.react_stack_bottom_frame.bind(TJ),uJ={react_stack_bottom_frame:function(w){var v=w.create;return w=w.inst,v=v(),w.destroy=v}},bW=uJ.react_stack_bottom_frame.bind(uJ),lJ={react_stack_bottom_frame:function(w,v,g){try{g()}catch(x){S0(w,v,x)}}},jW=lJ.react_stack_bottom_frame.bind(lJ),yJ={react_stack_bottom_frame:function(w){var v=w._init;return v(w._payload)}},AW=yJ.react_stack_bottom_frame.bind(yJ),ug=Error("Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."),Mz=Error("Suspense Exception: This is not a real error, and should not leak into userspace. If you're seeing this, it's likely a bug in React."),P6=Error("Suspense Exception: This is not a real error! It's an implementation detail of `useActionState` to interrupt the current render. You must either rethrow it immediately, or move the `useActionState` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary."),C6={then:function(){console.error('Internal React error: A listener was unexpectedly attached to a "noop" thenable. This is a bug in React. Please file an issue.')}},Sv=null,Ix=!1,lg=null,bx=0,L0=null,Yz,aJ=Yz=!1,cJ={},sJ={},iJ={};P=function(w,v,g){if(g!==null&&typeof g==="object"&&g._store&&(!g._store.validated&&g.key==null||g._store.validated===2)){if(typeof g._store!=="object")throw Error("React Component in warnForMissingKey should have a _store. This error is likely caused by a bug in React. Please file an issue.");g._store.validated=1;var x=l(w),z=x||"null";if(!cJ[z]){cJ[z]=!0,g=g._owner,w=w._debugOwner;var G="";w&&typeof w.tag==="number"&&(z=l(w))&&(G=`

Check the render method of \``+z+"`."),G||x&&(G=`

Check the top-level render call using <`+x+">.");var Z="";g!=null&&w!==g&&(x=null,typeof g.tag==="number"?x=l(g):typeof g.name==="string"&&(x=g.name),x&&(Z=" It was passed a child from "+x+".")),n(v,function(){console.error('Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.',G,Z)})}}};var dv=TZ(!0),rJ=TZ(!1),nJ=0,oJ=1,tJ=2,Lz=3,y5=!1,pJ=!1,Iz=null,bz=!1,yg=xw(null),_6=xw(0),D2=xw(null),y2=null,ag=1,jx=2,Uw=xw(0),f6=0,a2=1,ow=2,k2=4,tw=8,cg,eJ=new Set,wQ=new Set,jz=new Set,vQ=new Set,G5=0,H0=null,y0=null,Yw=null,E6=!1,sg=!1,Tv=!1,N6=0,Ax=0,Z5=null,OW=0,RW=25,D=null,c2=null,B5=-1,Ox=!1,Rx={readContext:ww,use:R5,useCallback:Jw,useContext:Jw,useEffect:Jw,useImperativeHandle:Jw,useLayoutEffect:Jw,useInsertionEffect:Jw,useMemo:Jw,useReducer:Jw,useRef:Jw,useState:Jw,useDebugValue:Jw,useDeferredValue:Jw,useTransition:Jw,useSyncExternalStore:Jw,useId:Jw,useHostTransitionStatus:Jw,useFormState:Jw,useActionState:Jw,useOptimistic:Jw,useMemoCache:Jw,useCacheRefresh:Jw};Rx.useEffectEvent=Jw;var Az=null,gQ=null,Oz=null,xQ=null,T1=null,G1=null,S6=null;Az={readContext:function(w){return ww(w)},use:R5,useCallback:function(w,v){return D="useCallback",A0(),Xg(v),b7(w,v)},useContext:function(w){return D="useContext",A0(),ww(w)},useEffect:function(w,v){return D="useEffect",A0(),Xg(v),h3(w,v)},useImperativeHandle:function(w,v,g){return D="useImperativeHandle",A0(),Xg(g),I7(w,v,g)},useInsertionEffect:function(w,v){D="useInsertionEffect",A0(),Xg(v),Av(4,ow,w,v)},useLayoutEffect:function(w,v){return D="useLayoutEffect",A0(),Xg(v),L7(w,v)},useMemo:function(w,v){D="useMemo",A0(),Xg(v);var g=k.H;k.H=T1;try{return j7(w,v)}finally{k.H=g}},useReducer:function(w,v,g){D="useReducer",A0();var x=k.H;k.H=T1;try{return J7(w,v,g)}finally{k.H=x}},useRef:function(w){return D="useRef",A0(),M7(w)},useState:function(w){D="useState",A0();var v=k.H;k.H=T1;try{return U7(w)}finally{k.H=v}},useDebugValue:function(){D="useDebugValue",A0()},useDeferredValue:function(w,v){return D="useDeferredValue",A0(),A7(w,v)},useTransition:function(){return D="useTransition",A0(),V7()},useSyncExternalStore:function(w,v,g){return D="useSyncExternalStore",A0(),$7(w,v,g)},useId:function(){return D="useId",A0(),D7()},useFormState:function(w,v){return D="useFormState",A0(),R3(),Jg(w,v)},useActionState:function(w,v){return D="useActionState",A0(),Jg(w,v)},useOptimistic:function(w){return D="useOptimistic",A0(),K7(w)},useHostTransitionStatus:Ov,useMemoCache:jv,useCacheRefresh:function(){return D="useCacheRefresh",A0(),k7()},useEffectEvent:function(w){return D="useEffectEvent",A0(),Y7(w)}},gQ={readContext:function(w){return ww(w)},use:R5,useCallback:function(w,v){return D="useCallback",f(),b7(w,v)},useContext:function(w){return D="useContext",f(),ww(w)},useEffect:function(w,v){return D="useEffect",f(),h3(w,v)},useImperativeHandle:function(w,v,g){return D="useImperativeHandle",f(),I7(w,v,g)},useInsertionEffect:function(w,v){D="useInsertionEffect",f(),Av(4,ow,w,v)},useLayoutEffect:function(w,v){return D="useLayoutEffect",f(),L7(w,v)},useMemo:function(w,v){D="useMemo",f();var g=k.H;k.H=T1;try{return j7(w,v)}finally{k.H=g}},useReducer:function(w,v,g){D="useReducer",f();var x=k.H;k.H=T1;try{return J7(w,v,g)}finally{k.H=x}},useRef:function(w){return D="useRef",f(),M7(w)},useState:function(w){D="useState",f();var v=k.H;k.H=T1;try{return U7(w)}finally{k.H=v}},useDebugValue:function(){D="useDebugValue",f()},useDeferredValue:function(w,v){return D="useDeferredValue",f(),A7(w,v)},useTransition:function(){return D="useTransition",f(),V7()},useSyncExternalStore:function(w,v,g){return D="useSyncExternalStore",f(),$7(w,v,g)},useId:function(){return D="useId",f(),D7()},useActionState:function(w,v){return D="useActionState",f(),Jg(w,v)},useFormState:function(w,v){return D="useFormState",f(),R3(),Jg(w,v)},useOptimistic:function(w){return D="useOptimistic",f(),K7(w)},useHostTransitionStatus:Ov,useMemoCache:jv,useCacheRefresh:function(){return D="useCacheRefresh",f(),k7()},useEffectEvent:function(w){return D="useEffectEvent",f(),Y7(w)}},Oz={readContext:function(w){return ww(w)},use:R5,useCallback:function(w,v){return D="useCallback",f(),_3(w,v)},useContext:function(w){return D="useContext",f(),ww(w)},useEffect:function(w,v){D="useEffect",f(),Z2(2048,tw,w,v)},useImperativeHandle:function(w,v,g){return D="useImperativeHandle",f(),C3(w,v,g)},useInsertionEffect:function(w,v){return D="useInsertionEffect",f(),Z2(4,ow,w,v)},useLayoutEffect:function(w,v){return D="useLayoutEffect",f(),Z2(4,k2,w,v)},useMemo:function(w,v){D="useMemo",f();var g=k.H;k.H=G1;try{return f3(w,v)}finally{k.H=g}},useReducer:function(w,v,g){D="useReducer",f();var x=k.H;k.H=G1;try{return Hg(w,v,g)}finally{k.H=x}},useRef:function(){return D="useRef",f(),T0().memoizedState},useState:function(){D="useState",f();var w=k.H;k.H=G1;try{return Hg(e2)}finally{k.H=w}},useDebugValue:function(){D="useDebugValue",f()},useDeferredValue:function(w,v){return D="useDeferredValue",f(),BB(w,v)},useTransition:function(){return D="useTransition",f(),qB()},useSyncExternalStore:function(w,v,g){return D="useSyncExternalStore",f(),D3(w,v,g)},useId:function(){return D="useId",f(),T0().memoizedState},useFormState:function(w){return D="useFormState",f(),R3(),k3(w)},useActionState:function(w){return D="useActionState",f(),k3(w)},useOptimistic:function(w,v){return D="useOptimistic",f(),tZ(w,v)},useHostTransitionStatus:Ov,useMemoCache:jv,useCacheRefresh:function(){return D="useCacheRefresh",f(),T0().memoizedState},useEffectEvent:function(w){return D="useEffectEvent",f(),P3(w)}},xQ={readContext:function(w){return ww(w)},use:R5,useCallback:function(w,v){return D="useCallback",f(),_3(w,v)},useContext:function(w){return D="useContext",f(),ww(w)},useEffect:function(w,v){D="useEffect",f(),Z2(2048,tw,w,v)},useImperativeHandle:function(w,v,g){return D="useImperativeHandle",f(),C3(w,v,g)},useInsertionEffect:function(w,v){return D="useInsertionEffect",f(),Z2(4,ow,w,v)},useLayoutEffect:function(w,v){return D="useLayoutEffect",f(),Z2(4,k2,w,v)},useMemo:function(w,v){D="useMemo",f();var g=k.H;k.H=S6;try{return f3(w,v)}finally{k.H=g}},useReducer:function(w,v,g){D="useReducer",f();var x=k.H;k.H=S6;try{return h4(w,v,g)}finally{k.H=x}},useRef:function(){return D="useRef",f(),T0().memoizedState},useState:function(){D="useState",f();var w=k.H;k.H=S6;try{return h4(e2)}finally{k.H=w}},useDebugValue:function(){D="useDebugValue",f()},useDeferredValue:function(w,v){return D="useDeferredValue",f(),XB(w,v)},useTransition:function(){return D="useTransition",f(),UB()},useSyncExternalStore:function(w,v,g){return D="useSyncExternalStore",f(),D3(w,v,g)},useId:function(){return D="useId",f(),T0().memoizedState},useFormState:function(w){return D="useFormState",f(),R3(),F3(w)},useActionState:function(w){return D="useActionState",f(),F3(w)},useOptimistic:function(w,v){return D="useOptimistic",f(),eZ(w,v)},useHostTransitionStatus:Ov,useMemoCache:jv,useCacheRefresh:function(){return D="useCacheRefresh",f(),T0().memoizedState},useEffectEvent:function(w){return D="useEffectEvent",f(),P3(w)}},T1={readContext:function(w){return m(),ww(w)},use:function(w){return O(),R5(w)},useCallback:function(w,v){return D="useCallback",O(),A0(),b7(w,v)},useContext:function(w){return D="useContext",O(),A0(),ww(w)},useEffect:function(w,v){return D="useEffect",O(),A0(),h3(w,v)},useImperativeHandle:function(w,v,g){return D="useImperativeHandle",O(),A0(),I7(w,v,g)},useInsertionEffect:function(w,v){D="useInsertionEffect",O(),A0(),Av(4,ow,w,v)},useLayoutEffect:function(w,v){return D="useLayoutEffect",O(),A0(),L7(w,v)},useMemo:function(w,v){D="useMemo",O(),A0();var g=k.H;k.H=T1;try{return j7(w,v)}finally{k.H=g}},useReducer:function(w,v,g){D="useReducer",O(),A0();var x=k.H;k.H=T1;try{return J7(w,v,g)}finally{k.H=x}},useRef:function(w){return D="useRef",O(),A0(),M7(w)},useState:function(w){D="useState",O(),A0();var v=k.H;k.H=T1;try{return U7(w)}finally{k.H=v}},useDebugValue:function(){D="useDebugValue",O(),A0()},useDeferredValue:function(w,v){return D="useDeferredValue",O(),A0(),A7(w,v)},useTransition:function(){return D="useTransition",O(),A0(),V7()},useSyncExternalStore:function(w,v,g){return D="useSyncExternalStore",O(),A0(),$7(w,v,g)},useId:function(){return D="useId",O(),A0(),D7()},useFormState:function(w,v){return D="useFormState",O(),A0(),Jg(w,v)},useActionState:function(w,v){return D="useActionState",O(),A0(),Jg(w,v)},useOptimistic:function(w){return D="useOptimistic",O(),A0(),K7(w)},useMemoCache:function(w){return O(),jv(w)},useHostTransitionStatus:Ov,useCacheRefresh:function(){return D="useCacheRefresh",A0(),k7()},useEffectEvent:function(w){return D="useEffectEvent",O(),A0(),Y7(w)}},G1={readContext:function(w){return m(),ww(w)},use:function(w){return O(),R5(w)},useCallback:function(w,v){return D="useCallback",O(),f(),_3(w,v)},useContext:function(w){return D="useContext",O(),f(),ww(w)},useEffect:function(w,v){D="useEffect",O(),f(),Z2(2048,tw,w,v)},useImperativeHandle:function(w,v,g){return D="useImperativeHandle",O(),f(),C3(w,v,g)},useInsertionEffect:function(w,v){return D="useInsertionEffect",O(),f(),Z2(4,ow,w,v)},useLayoutEffect:function(w,v){return D="useLayoutEffect",O(),f(),Z2(4,k2,w,v)},useMemo:function(w,v){D="useMemo",O(),f();var g=k.H;k.H=G1;try{return f3(w,v)}finally{k.H=g}},useReducer:function(w,v,g){D="useReducer",O(),f();var x=k.H;k.H=G1;try{return Hg(w,v,g)}finally{k.H=x}},useRef:function(){return D="useRef",O(),f(),T0().memoizedState},useState:function(){D="useState",O(),f();var w=k.H;k.H=G1;try{return Hg(e2)}finally{k.H=w}},useDebugValue:function(){D="useDebugValue",O(),f()},useDeferredValue:function(w,v){return D="useDeferredValue",O(),f(),BB(w,v)},useTransition:function(){return D="useTransition",O(),f(),qB()},useSyncExternalStore:function(w,v,g){return D="useSyncExternalStore",O(),f(),D3(w,v,g)},useId:function(){return D="useId",O(),f(),T0().memoizedState},useFormState:function(w){return D="useFormState",O(),f(),k3(w)},useActionState:function(w){return D="useActionState",O(),f(),k3(w)},useOptimistic:function(w,v){return D="useOptimistic",O(),f(),tZ(w,v)},useMemoCache:function(w){return O(),jv(w)},useHostTransitionStatus:Ov,useCacheRefresh:function(){return D="useCacheRefresh",f(),T0().memoizedState},useEffectEvent:function(w){return D="useEffectEvent",O(),f(),P3(w)}},S6={readContext:function(w){return m(),ww(w)},use:function(w){return O(),R5(w)},useCallback:function(w,v){return D="useCallback",O(),f(),_3(w,v)},useContext:function(w){return D="useContext",O(),f(),ww(w)},useEffect:function(w,v){D="useEffect",O(),f(),Z2(2048,tw,w,v)},useImperativeHandle:function(w,v,g){return D="useImperativeHandle",O(),f(),C3(w,v,g)},useInsertionEffect:function(w,v){return D="useInsertionEffect",O(),f(),Z2(4,ow,w,v)},useLayoutEffect:function(w,v){return D="useLayoutEffect",O(),f(),Z2(4,k2,w,v)},useMemo:function(w,v){D="useMemo",O(),f();var g=k.H;k.H=G1;try{return f3(w,v)}finally{k.H=g}},useReducer:function(w,v,g){D="useReducer",O(),f();var x=k.H;k.H=G1;try{return h4(w,v,g)}finally{k.H=x}},useRef:function(){return D="useRef",O(),f(),T0().memoizedState},useState:function(){D="useState",O(),f();var w=k.H;k.H=G1;try{return h4(e2)}finally{k.H=w}},useDebugValue:function(){D="useDebugValue",O(),f()},useDeferredValue:function(w,v){return D="useDeferredValue",O(),f(),XB(w,v)},useTransition:function(){return D="useTransition",O(),f(),UB()},useSyncExternalStore:function(w,v,g){return D="useSyncExternalStore",O(),f(),D3(w,v,g)},useId:function(){return D="useId",O(),f(),T0().memoizedState},useFormState:function(w){return D="useFormState",O(),f(),F3(w)},useActionState:function(w){return D="useActionState",O(),f(),F3(w)},useOptimistic:function(w,v){return D="useOptimistic",O(),f(),eZ(w,v)},useMemoCache:function(w){return O(),jv(w)},useHostTransitionStatus:Ov,useCacheRefresh:function(){return D="useCacheRefresh",f(),T0().memoizedState},useEffectEvent:function(w){return D="useEffectEvent",O(),f(),P3(w)}};var zQ={},GQ=new Set,ZQ=new Set,BQ=new Set,XQ=new Set,HQ=new Set,JQ=new Set,QQ=new Set,$Q=new Set,qQ=new Set,UQ=new Set;Object.freeze(zQ);var Rz={enqueueSetState:function(w,v,g){w=w._reactInternals;var x=b2(w),z=b5(x);z.payload=v,g!==void 0&&g!==null&&(h7(g),z.callback=g),v=j5(w,z,x),v!==null&&(W1(x,"this.setState()",w),Bw(v,w,x),V4(v,w,x))},enqueueReplaceState:function(w,v,g){w=w._reactInternals;var x=b2(w),z=b5(x);z.tag=oJ,z.payload=v,g!==void 0&&g!==null&&(h7(g),z.callback=g),v=j5(w,z,x),v!==null&&(W1(x,"this.replaceState()",w),Bw(v,w,x),V4(v,w,x))},enqueueForceUpdate:function(w,v){w=w._reactInternals;var g=b2(w),x=b5(g);x.tag=tJ,v!==void 0&&v!==null&&(h7(v),x.callback=v),v=j5(w,x,g),v!==null&&(W1(g,"this.forceUpdate()",w),Bw(v,w,g),V4(v,w,g))}},ig=null,Vz=null,Dz=Error("This is not a real error. It's an implementation detail of React's selective hydration feature. If this leaks into userspace, it's a bug in React. Please file an issue."),Lw=!1,KQ={},WQ={},MQ={},YQ={},rg=!1,LQ={},d6={},kz={dehydrated:null,treeContext:null,retryLane:0,hydrationErrors:null},IQ=!1,bQ=null;bQ=new Set;var X5=!1,Iw=!1,Fz=!1,jQ=typeof WeakSet==="function"?WeakSet:Set,hw=null,ng=null,og=null,bw=null,H2=!1,Z1=null,Rw=!1,Vx=8192,VW={getCacheForType:function(w){var v=ww(Ww),g=v.data.get(w);return g===void 0&&(g=w(),v.data.set(w,g)),g},cacheSignal:function(){return ww(Ww).controller.signal},getOwner:function(){return O2}};if(typeof Symbol==="function"&&Symbol.for){var Dx=Symbol.for;Dx("selector.component"),Dx("selector.has_pseudo_class"),Dx("selector.role"),Dx("selector.test_id"),Dx("selector.text")}var DW=[],kW=typeof WeakMap==="function"?WeakMap:Map,Pw=0,Vw=2,F2=4,H5=0,kx=1,mv=2,T6=3,a5=4,m6=6,AQ=5,P0=Pw,a0=null,j0=null,I0=0,J2=0,u6=1,uv=2,Fx=3,OQ=4,hz=5,hx=6,l6=7,Pz=8,lv=9,m0=J2,h2=null,c5=!1,tg=!1,Cz=!1,m1=0,Gw=H5,s5=0,i5=0,_z=0,Q2=0,yv=0,Px=null,pw=null,y6=!1,a6=0,RQ=0,VQ=300,c6=1/0,DQ=500,Cx=null,Qw=null,r5=null,s6=0,fz=1,Ez=2,kQ=3,n5=0,FQ=1,hQ=2,PQ=3,CQ=4,i6=5,jw=0,o5=null,pg=null,B1=0,Nz=0,Sz=-0,dz=null,_Q=null,fQ=null,X1=s6,EQ=null,FW=50,_x=0,Tz=null,mz=!1,r6=!1,hW=50,av=0,fx=null,eg=!1,n6=null,NQ=!1,SQ=new Set,PW={},o6=null,w4=null,uz=!1,lz=!1,t6=!1,yz=!1,t5=0,az={};(function(){for(var w=0;w<vz.length;w++){var v=vz[w],g=v.toLowerCase();v=v[0].toUpperCase()+v.slice(1),p2(g,"on"+v)}p2(qJ,"onAnimationEnd"),p2(UJ,"onAnimationIteration"),p2(KJ,"onAnimationStart"),p2("dblclick","onDoubleClick"),p2("focusin","onFocus"),p2("focusout","onBlur"),p2(BW,"onTransitionRun"),p2(XW,"onTransitionStart"),p2(HW,"onTransitionCancel"),p2(WJ,"onTransitionEnd")})(),U2("onMouseEnter",["mouseout","mouseover"]),U2("onMouseLeave",["mouseout","mouseover"]),U2("onPointerEnter",["pointerout","pointerover"]),U2("onPointerLeave",["pointerout","pointerover"]),dw("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),dw("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),dw("onBeforeInput",["compositionend","keypress","textInput","paste"]),dw("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),dw("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),dw("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Ex="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),cz=new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Ex)),p6="_reactListening"+Math.random().toString(36).slice(2),dQ=!1,TQ=!1,e6=!1,mQ=!1,w8=!1,v8=!1,uQ=!1,g8={},CW=/\r\n?/g,_W=/\u0000|\uFFFD/g,cv="http://www.w3.org/1999/xlink",sz="http://www.w3.org/XML/1998/namespace",fW="javascript:throw new Error('React form unexpectedly submitted.')",EW="suppressHydrationWarning",sv="&",x8="/&",Nx="$",Sx="/$",p5="$?",iv="$~",v4="$!",NW="html",SW="body",dW="head",iz="F!",lQ="F",yQ="loading",TW="style",J5=0,g4=1,z8=2,rz=null,nz=null,aQ={dialog:!0,webview:!0},oz=null,dx=void 0,cQ=typeof setTimeout==="function"?setTimeout:void 0,mW=typeof clearTimeout==="function"?clearTimeout:void 0,rv=-1,sQ=typeof Promise==="function"?Promise:void 0,uW=typeof queueMicrotask==="function"?queueMicrotask:typeof sQ<"u"?function(w){return sQ.resolve(null).then(w).catch(RU)}:cQ,tz=null,nv=0,Tx=1,iQ=2,rQ=3,s2=4,i2=new Map,nQ=new Set,Q5=d0.d;d0.d={f:function(){var w=Q5.f(),v=Kg();return w||v},r:function(w){var v=$0(w);v!==null&&v.tag===5&&v.type==="form"?$B(v):Q5.r(w)},D:function(w){Q5.D(w),GH("dns-prefetch",w,null)},C:function(w,v){Q5.C(w,v),GH("preconnect",w,v)},L:function(w,v,g){Q5.L(w,v,g);var x=x4;if(x&&w&&v){var z='link[rel="preload"][as="'+f2(v)+'"]';v==="image"?g&&g.imageSrcSet?(z+='[imagesrcset="'+f2(g.imageSrcSet)+'"]',typeof g.imageSizes==="string"&&(z+='[imagesizes="'+f2(g.imageSizes)+'"]')):z+='[href="'+f2(w)+'"]':z+='[href="'+f2(w)+'"]';var G=z;switch(v){case"style":G=Yg(w);break;case"script":G=Lg(w)}i2.has(G)||(w=O0({rel:"preload",href:v==="image"&&g&&g.imageSrcSet?void 0:w,as:v},g),i2.set(G,w),x.querySelector(z)!==null||v==="style"&&x.querySelector(c4(G))||v==="script"&&x.querySelector(s4(G))||(v=x.createElement("link"),Ew(v,"link",w),z0(v),x.head.appendChild(v)))}},m:function(w,v){Q5.m(w,v);var g=x4;if(g&&w){var x=v&&typeof v.as==="string"?v.as:"script",z='link[rel="modulepreload"][as="'+f2(x)+'"][href="'+f2(w)+'"]',G=z;switch(x){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":G=Lg(w)}if(!i2.has(G)&&(w=O0({rel:"modulepreload",href:w},v),i2.set(G,w),g.querySelector(z)===null)){switch(x){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":if(g.querySelector(s4(G)))return}x=g.createElement("link"),Ew(x,"link",w),z0(x),g.head.appendChild(x)}}},X:function(w,v){Q5.X(w,v);var g=x4;if(g&&w){var x=C0(g).hoistableScripts,z=Lg(w),G=x.get(z);G||(G=g.querySelector(s4(z)),G||(w=O0({src:w,async:!0},v),(v=i2.get(z))&&I9(w,v),G=g.createElement("script"),z0(G),Ew(G,"link",w),g.head.appendChild(G)),G={type:"script",instance:G,count:1,state:null},x.set(z,G))}},S:function(w,v,g){Q5.S(w,v,g);var x=x4;if(x&&w){var z=C0(x).hoistableStyles,G=Yg(w);v=v||"default";var Z=z.get(G);if(!Z){var B={loading:nv,preload:null};if(Z=x.querySelector(c4(G)))B.loading=Tx|s2;else{w=O0({rel:"stylesheet",href:w,"data-precedence":v},g),(g=i2.get(G))&&L9(w,g);var X=Z=x.createElement("link");z0(X),Ew(X,"link",w),X._p=new Promise(function(H,Y){X.onload=H,X.onerror=Y}),X.addEventListener("load",function(){B.loading|=Tx}),X.addEventListener("error",function(){B.loading|=iQ}),B.loading|=s2,e3(Z,v,x)}Z={type:"stylesheet",instance:Z,count:1,state:B},z.set(G,Z)}}},M:function(w,v){Q5.M(w,v);var g=x4;if(g&&w){var x=C0(g).hoistableScripts,z=Lg(w),G=x.get(z);G||(G=g.querySelector(s4(z)),G||(w=O0({src:w,async:!0,type:"module"},v),(v=i2.get(z))&&I9(w,v),G=g.createElement("script"),z0(G),Ew(G,"link",w),g.head.appendChild(G)),G={type:"script",instance:G,count:1,state:null},x.set(z,G))}}};var x4=typeof document>"u"?null:document,G8=null,lW=60000,yW=800,aW=500,pz=0,ez=null,Z8=null,ov=GK,mx={$$typeof:h1,Provider:null,Consumer:null,_currentValue:ov,_currentValue2:ov,_threadCount:0},oQ="%c%s%c",tQ="background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px",pQ="",B8=" ",cW=Function.prototype.bind,eQ=!1,w$=null,v$=null,g$=null,x$=null,z$=null,G$=null,Z$=null,B$=null,X$=null,H$=null;w$=function(w,v,g,x){v=Q(w,v),v!==null&&(g=$(v.memoizedState,g,0,x),v.memoizedState=g,v.baseState=g,w.memoizedProps=O0({},w.memoizedProps),g=Tw(w,2),g!==null&&Bw(g,w,2))},v$=function(w,v,g){v=Q(w,v),v!==null&&(g=b(v.memoizedState,g,0),v.memoizedState=g,v.baseState=g,w.memoizedProps=O0({},w.memoizedProps),g=Tw(w,2),g!==null&&Bw(g,w,2))},g$=function(w,v,g,x){v=Q(w,v),v!==null&&(g=M(v.memoizedState,g,x),v.memoizedState=g,v.baseState=g,w.memoizedProps=O0({},w.memoizedProps),g=Tw(w,2),g!==null&&Bw(g,w,2))},x$=function(w,v,g){w.pendingProps=$(w.memoizedProps,v,0,g),w.alternate&&(w.alternate.pendingProps=w.pendingProps),v=Tw(w,2),v!==null&&Bw(v,w,2)},z$=function(w,v){w.pendingProps=b(w.memoizedProps,v,0),w.alternate&&(w.alternate.pendingProps=w.pendingProps),v=Tw(w,2),v!==null&&Bw(v,w,2)},G$=function(w,v,g){w.pendingProps=M(w.memoizedProps,v,g),w.alternate&&(w.alternate.pendingProps=w.pendingProps),v=Tw(w,2),v!==null&&Bw(v,w,2)},Z$=function(w){var v=Tw(w,2);v!==null&&Bw(v,w,2)},B$=function(w){var v=vg(),g=Tw(w,v);g!==null&&Bw(g,w,v)},X$=function(w){_=w},H$=function(w){d=w};var X8=!0,H8=null,wG=!1,e5=null,wv=null,vv=null,ux=new Map,lx=new Map,gv=[],sW="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" "),J8=null;if(z6.prototype.render=V9.prototype.render=function(w){var v=this._internalRoot;if(v===null)throw Error("Cannot update an unmounted root.");var g=arguments;typeof g[1]==="function"?console.error("does not support the second callback argument. To execute a side effect after rendering, declare it in a component body with useEffect()."):f0(g[1])?console.error("You passed a container to the second argument of root.render(...). You don't need to pass it again since you already passed it to create the root."):typeof g[1]<"u"&&console.error("You passed a second argument to root.render(...) but it only accepts one argument."),g=w;var x=v.current,z=b2(x);b9(x,z,g,v,null,null)},z6.prototype.unmount=V9.prototype.unmount=function(){var w=arguments;if(typeof w[0]==="function"&&console.error("does not support a callback argument. To execute a side effect after rendering, declare it in a component body with useEffect()."),w=this._internalRoot,w!==null){this._internalRoot=null;var v=w.containerInfo;(P0&(Vw|F2))!==Pw&&console.error("Attempted to synchronously unmount a root while React was already rendering. React cannot finish unmounting the root until the current render has completed, which may lead to a race condition."),b9(w.current,2,null,w,null,null),Kg(),v[C5]=null}},z6.prototype.unstable_scheduleHydration=function(w){if(w){var v=I();w={blockedOn:null,target:w,priority:v};for(var g=0;g<gv.length&&v!==0&&v<gv[g].priority;g++);gv.splice(g,0,w),g===0&&LH(w)}},function(){var w=z4.version;if(w!=="19.2.0")throw Error(`Incompatible React versions: The "react" and "react-dom" packages must have the exact same version. Instead got:
  - react:      `+(w+`
  - react-dom:  19.2.0
Learn more: https://react.dev/warnings/version-mismatch`))}(),typeof Map==="function"&&Map.prototype!=null&&typeof Map.prototype.forEach==="function"&&typeof Set==="function"&&Set.prototype!=null&&typeof Set.prototype.clear==="function"&&typeof Set.prototype.forEach==="function"||console.error("React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://react.dev/link/react-polyfills"),d0.findDOMNode=function(w){var v=w._reactInternals;if(v===void 0){if(typeof w.render==="function")throw Error("Unable to find node on an unmounted component.");throw w=Object.keys(w).join(","),Error("Argument appears to not be a ReactComponent. Keys: "+w)}return w=x2(v),w=w!==null?$2(w):null,w=w===null?null:w.stateNode,w},!function(){var w={bundleType:1,version:"19.2.0",rendererPackageName:"react-dom",currentDispatcherRef:k,reconcilerVersion:"19.2.0"};return w.overrideHookState=w$,w.overrideHookStateDeletePath=v$,w.overrideHookStateRenamePath=g$,w.overrideProps=x$,w.overridePropsDeletePath=z$,w.overridePropsRenamePath=G$,w.scheduleUpdate=Z$,w.scheduleRetry=B$,w.setErrorHandler=X$,w.setSuspenseHandler=H$,w.scheduleRefresh=Q0,w.scheduleRoot=X0,w.setRefreshHandler=K0,w.getCurrentFiber=tU,wg(w)}()&&E1&&window.top===window.self&&(-1<navigator.userAgent.indexOf("Chrome")&&navigator.userAgent.indexOf("Edge")===-1||-1<navigator.userAgent.indexOf("Firefox"))){var J$=window.location.protocol;/^(https?|file):$/.test(J$)&&console.info("%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools"+(J$==="file:"?`
You might need to use a local HTTP server (instead of file://): https://react.dev/link/react-devtools-faq`:""),"font-weight:bold")}xM.createRoot=function(w,v){if(!f0(w))throw Error("Target container is not a DOM element.");AH(w);var g=!1,x="",z=IB,G=bB,Z=jB;return v!==null&&v!==void 0&&(v.hydrate?console.warn("hydrate through createRoot is deprecated. Use ReactDOMClient.hydrateRoot(container, <App />) instead."):typeof v==="object"&&v!==null&&v.$$typeof===F1&&console.error(`You passed a JSX element to createRoot. You probably meant to call root.render instead. Example usage:

  let root = createRoot(domContainer);
  root.render(<App />);`),v.unstable_strictMode===!0&&(g=!0),v.identifierPrefix!==void 0&&(x=v.identifierPrefix),v.onUncaughtError!==void 0&&(z=v.onUncaughtError),v.onCaughtError!==void 0&&(G=v.onCaughtError),v.onRecoverableError!==void 0&&(Z=v.onRecoverableError)),v=$H(w,1,!1,null,null,g,x,null,z,G,Z,jH),w[C5]=v.current,B9(w),new V9(v)},xM.hydrateRoot=function(w,v,g){if(!f0(w))throw Error("Target container is not a DOM element.");AH(w),v===void 0&&console.error("Must provide initial children as second argument to hydrateRoot. Example usage: hydrateRoot(domContainer, <App />)");var x=!1,z="",G=IB,Z=bB,B=jB,X=null;return g!==null&&g!==void 0&&(g.unstable_strictMode===!0&&(x=!0),g.identifierPrefix!==void 0&&(z=g.identifierPrefix),g.onUncaughtError!==void 0&&(G=g.onUncaughtError),g.onCaughtError!==void 0&&(Z=g.onCaughtError),g.onRecoverableError!==void 0&&(B=g.onRecoverableError),g.formState!==void 0&&(X=g.formState)),v=$H(w,1,!0,v,g!=null?g:null,x,z,X,G,Z,B,jH),v.context=qH(null),g=v.current,x=b2(g),x=$v(x),z=b5(x),z.callback=null,j5(g,z,x),W1(x,"hydrateRoot()",null),g=x,v.current.lanes=g,U5(v,g),D1(v),w[C5]=v.current,B9(w),new z6(v)},xM.version="19.2.0",typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop==="function"&&__REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error())})()});var Y$=Hw((WI,M$)=>{var zM=N0(W$());M$.exports=zM});var xG=Hw((GM)=>{(function(){var Q=typeof Symbol==="function"&&Symbol.for,$=Q?Symbol.for("react.element"):60103,M=Q?Symbol.for("react.portal"):60106,A=Q?Symbol.for("react.fragment"):60107,b=Q?Symbol.for("react.strict_mode"):60108,d=Q?Symbol.for("react.profiler"):60114,_=Q?Symbol.for("react.provider"):60109,O=Q?Symbol.for("react.context"):60110,m=Q?Symbol.for("react.async_mode"):60111,r=Q?Symbol.for("react.concurrent_mode"):60111,P=Q?Symbol.for("react.forward_ref"):60112,j=Q?Symbol.for("react.suspense"):60113,E=Q?Symbol.for("react.suspense_list"):60120,X0=Q?Symbol.for("react.memo"):60115,Q0=Q?Symbol.for("react.lazy"):60116,K0=Q?Symbol.for("react.block"):60121,f0=Q?Symbol.for("react.fundamental"):60117,Aw=Q?Symbol.for("react.responder"):60118,Cw=Q?Symbol.for("react.scope"):60119;function $w(g0){return typeof g0==="string"||typeof g0==="function"||g0===A||g0===r||g0===d||g0===b||g0===j||g0===E||typeof g0==="object"&&g0!==null&&(g0.$$typeof===Q0||g0.$$typeof===X0||g0.$$typeof===_||g0.$$typeof===O||g0.$$typeof===P||g0.$$typeof===f0||g0.$$typeof===Aw||g0.$$typeof===Cw||g0.$$typeof===K0)}function c0(g0){if(typeof g0==="object"&&g0!==null){var t2=g0.$$typeof;switch(t2){case $:var q2=g0.type;switch(q2){case m:case r:case A:case d:case b:case j:return q2;default:var qw=q2&&q2.$$typeof;switch(qw){case O:case P:case Q0:case X0:case _:return qw;default:return t2}}case M:return t2}}return}var x2=m,$2=r,o0=O,b0=_,Zw=$,l=P,xw=A,k0=Q0,h=X0,y=M,C=d,T=b,S=j,t=!1;function o(g0){if(!t)t=!0,console.warn("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 17+. Update your code to use ReactIs.isConcurrentMode() instead. It has the exact same API.");return V(g0)||c0(g0)===m}function V(g0){return c0(g0)===r}function a(g0){return c0(g0)===O}function v0(g0){return c0(g0)===_}function p(g0){return typeof g0==="object"&&g0!==null&&g0.$$typeof===$}function U0(g0){return c0(g0)===P}function s0(g0){return c0(g0)===A}function E0(g0){return c0(g0)===Q0}function yw(g0){return c0(g0)===X0}function z2(g0){return c0(g0)===M}function o2(g0){return c0(g0)===d}function ev(g0){return c0(g0)===b}function n(g0){return c0(g0)===j}GM.AsyncMode=x2,GM.ConcurrentMode=$2,GM.ContextConsumer=o0,GM.ContextProvider=b0,GM.Element=Zw,GM.ForwardRef=l,GM.Fragment=xw,GM.Lazy=k0,GM.Memo=h,GM.Portal=y,GM.Profiler=C,GM.StrictMode=T,GM.Suspense=S,GM.isAsyncMode=o,GM.isConcurrentMode=V,GM.isContextConsumer=a,GM.isContextProvider=v0,GM.isElement=p,GM.isForwardRef=U0,GM.isFragment=s0,GM.isLazy=E0,GM.isMemo=yw,GM.isPortal=z2,GM.isProfiler=o2,GM.isStrictMode=ev,GM.isSuspense=n,GM.isValidElementType=$w,GM.typeOf=c0})()});var b$=Hw((sI,I$)=>{var L$=Object.getOwnPropertySymbols,ZM=Object.prototype.hasOwnProperty,BM=Object.prototype.propertyIsEnumerable;function XM(Q){if(Q===null||Q===void 0)throw TypeError("Object.assign cannot be called with null or undefined");return Object(Q)}function HM(){try{if(!Object.assign)return!1;var Q=new String("abc");if(Q[5]="de",Object.getOwnPropertyNames(Q)[0]==="5")return!1;var $={};for(var M=0;M<10;M++)$["_"+String.fromCharCode(M)]=M;var A=Object.getOwnPropertyNames($).map(function(d){return $[d]});if(A.join("")!=="0123456789")return!1;var b={};if("abcdefghijklmnopqrst".split("").forEach(function(d){b[d]=d}),Object.keys(Object.assign({},b)).join("")!=="abcdefghijklmnopqrst")return!1;return!0}catch(d){return!1}}I$.exports=HM()?Object.assign:function(Q,$){var M,A=XM(Q),b;for(var d=1;d<arguments.length;d++){M=Object(arguments[d]);for(var _ in M)if(ZM.call(M,_))A[_]=M[_];if(L$){b=L$(M);for(var O=0;O<b.length;O++)if(BM.call(M,b[O]))A[b[O]]=M[b[O]]}}return A}});var zG=Hw((iI,j$)=>{var JM="SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";j$.exports=JM});var GG=Hw((rI,A$)=>{A$.exports=Function.call.bind(Object.prototype.hasOwnProperty)});var V$=Hw((nI,R$)=>{var ZG=function(){};BG=zG(),yx={},XG=GG(),ZG=function(Q){var $="Warning: "+Q;if(typeof console<"u")console.error($);try{throw Error($)}catch(M){}};var BG,yx,XG;function O$(Q,$,M,A,b){for(var d in Q)if(XG(Q,d)){var _;try{if(typeof Q[d]!=="function"){var O=Error((A||"React class")+": "+M+" type `"+d+"` is invalid; it must be a function, usually from the `prop-types` package, but received `"+typeof Q[d]+"`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");throw O.name="Invariant Violation",O}_=Q[d]($,d,A,M,null,BG)}catch(r){_=r}if(_&&!(_ instanceof Error))ZG((A||"React class")+": type specification of "+M+" `"+d+"` is invalid; the type checker function must return `null` or an `Error` but returned a "+typeof _+". You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).");if(_ instanceof Error&&!(_.message in yx)){yx[_.message]=!0;var m=b?b():"";ZG("Failed "+M+" type: "+_.message+(m!=null?m:""))}}}O$.resetWarningCache=function(){yx={}};R$.exports=O$});var h$=Hw((oI,F$)=>{var k$=N0(xG()),QM=b$(),G4=zG(),HG=GG(),D$=V$(),Z4=function(){};Z4=function(Q){var $="Warning: "+Q;if(typeof console<"u")console.error($);try{throw Error($)}catch(M){}};function q8(){return null}F$.exports=function(Q,$){var M=typeof Symbol==="function"&&Symbol.iterator,A="@@iterator";function b(h){var y=h&&(M&&h[M]||h[A]);if(typeof y==="function")return y}var d="<<anonymous>>",_={array:P("array"),bigint:P("bigint"),bool:P("boolean"),func:P("function"),number:P("number"),object:P("object"),string:P("string"),symbol:P("symbol"),any:j(),arrayOf:E,element:X0(),elementType:Q0(),instanceOf:K0,node:$w(),objectOf:Aw,oneOf:f0,oneOfType:Cw,shape:x2,exact:$2};function O(h,y){if(h===y)return h!==0||1/h===1/y;else return h!==h&&y!==y}function m(h,y){this.message=h,this.data=y&&typeof y==="object"?y:{},this.stack=""}m.prototype=Error.prototype;function r(h){var y={},C=0;function T(t,o,V,a,v0,p,U0){if(a=a||d,p=p||V,U0!==G4){if($){var s0=Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use `PropTypes.checkPropTypes()` to call them. Read more at http://fb.me/use-check-prop-types");throw s0.name="Invariant Violation",s0}else if(typeof console<"u"){var E0=a+":"+V;if(!y[E0]&&C<3)Z4("You are manually calling a React.PropTypes validation function for the `"+p+"` prop on `"+a+"`. This is deprecated and will throw in the standalone `prop-types` package. You may be seeing this warning due to a third-party PropTypes library. See https://fb.me/react-warning-dont-call-proptypes for details."),y[E0]=!0,C++}}if(o[V]==null){if(t){if(o[V]===null)return new m("The "+v0+" `"+p+"` is marked as required "+("in `"+a+"`, but its value is `null`."));return new m("The "+v0+" `"+p+"` is marked as required in "+("`"+a+"`, but its value is `undefined`."))}return null}else return h(o,V,a,v0,p)}var S=T.bind(null,!1);return S.isRequired=T.bind(null,!0),S}function P(h){function y(C,T,S,t,o,V){var a=C[T],v0=Zw(a);if(v0!==h){var p=l(a);return new m("Invalid "+t+" `"+o+"` of type "+("`"+p+"` supplied to `"+S+"`, expected ")+("`"+h+"`."),{expectedType:h})}return null}return r(y)}function j(){return r(q8)}function E(h){function y(C,T,S,t,o){if(typeof h!=="function")return new m("Property `"+o+"` of component `"+S+"` has invalid PropType notation inside arrayOf.");var V=C[T];if(!Array.isArray(V)){var a=Zw(V);return new m("Invalid "+t+" `"+o+"` of type "+("`"+a+"` supplied to `"+S+"`, expected an array."))}for(var v0=0;v0<V.length;v0++){var p=h(V,v0,S,t,o+"["+v0+"]",G4);if(p instanceof Error)return p}return null}return r(y)}function X0(){function h(y,C,T,S,t){var o=y[C];if(!Q(o)){var V=Zw(o);return new m("Invalid "+S+" `"+t+"` of type "+("`"+V+"` supplied to `"+T+"`, expected a single ReactElement."))}return null}return r(h)}function Q0(){function h(y,C,T,S,t){var o=y[C];if(!k$.isValidElementType(o)){var V=Zw(o);return new m("Invalid "+S+" `"+t+"` of type "+("`"+V+"` supplied to `"+T+"`, expected a single ReactElement type."))}return null}return r(h)}function K0(h){function y(C,T,S,t,o){if(!(C[T]instanceof h)){var V=h.name||d,a=k0(C[T]);return new m("Invalid "+t+" `"+o+"` of type "+("`"+a+"` supplied to `"+S+"`, expected ")+("instance of `"+V+"`."))}return null}return r(y)}function f0(h){if(!Array.isArray(h)){if(arguments.length>1)Z4("Invalid arguments supplied to oneOf, expected an array, got "+arguments.length+" arguments. A common mistake is to write oneOf(x, y, z) instead of oneOf([x, y, z]).");else Z4("Invalid argument supplied to oneOf, expected an array.");return q8}function y(C,T,S,t,o){var V=C[T];for(var a=0;a<h.length;a++)if(O(V,h[a]))return null;var v0=JSON.stringify(h,function(U0,s0){var E0=l(s0);if(E0==="symbol")return String(s0);return s0});return new m("Invalid "+t+" `"+o+"` of value `"+String(V)+"` "+("supplied to `"+S+"`, expected one of "+v0+"."))}return r(y)}function Aw(h){function y(C,T,S,t,o){if(typeof h!=="function")return new m("Property `"+o+"` of component `"+S+"` has invalid PropType notation inside objectOf.");var V=C[T],a=Zw(V);if(a!=="object")return new m("Invalid "+t+" `"+o+"` of type "+("`"+a+"` supplied to `"+S+"`, expected an object."));for(var v0 in V)if(HG(V,v0)){var p=h(V,v0,S,t,o+"."+v0,G4);if(p instanceof Error)return p}return null}return r(y)}function Cw(h){if(!Array.isArray(h))return Z4("Invalid argument supplied to oneOfType, expected an instance of array."),q8;for(var y=0;y<h.length;y++){var C=h[y];if(typeof C!=="function")return Z4("Invalid argument supplied to oneOfType. Expected an array of check functions, but received "+xw(C)+" at index "+y+"."),q8}function T(S,t,o,V,a){var v0=[];for(var p=0;p<h.length;p++){var U0=h[p],s0=U0(S,t,o,V,a,G4);if(s0==null)return null;if(s0.data&&HG(s0.data,"expectedType"))v0.push(s0.data.expectedType)}var E0=v0.length>0?", expected one of type ["+v0.join(", ")+"]":"";return new m("Invalid "+V+" `"+a+"` supplied to "+("`"+o+"`"+E0+"."))}return r(T)}function $w(){function h(y,C,T,S,t){if(!o0(y[C]))return new m("Invalid "+S+" `"+t+"` supplied to "+("`"+T+"`, expected a ReactNode."));return null}return r(h)}function c0(h,y,C,T,S){return new m((h||"React class")+": "+y+" type `"+C+"."+T+"` is invalid; it must be a function, usually from the `prop-types` package, but received `"+S+"`.")}function x2(h){function y(C,T,S,t,o){var V=C[T],a=Zw(V);if(a!=="object")return new m("Invalid "+t+" `"+o+"` of type `"+a+"` "+("supplied to `"+S+"`, expected `object`."));for(var v0 in h){var p=h[v0];if(typeof p!=="function")return c0(S,t,o,v0,l(p));var U0=p(V,v0,S,t,o+"."+v0,G4);if(U0)return U0}return null}return r(y)}function $2(h){function y(C,T,S,t,o){var V=C[T],a=Zw(V);if(a!=="object")return new m("Invalid "+t+" `"+o+"` of type `"+a+"` "+("supplied to `"+S+"`, expected `object`."));var v0=QM({},C[T],h);for(var p in v0){var U0=h[p];if(HG(h,p)&&typeof U0!=="function")return c0(S,t,o,p,l(U0));if(!U0)return new m("Invalid "+t+" `"+o+"` key `"+p+"` supplied to `"+S+"`.\nBad object: "+JSON.stringify(C[T],null,"  ")+`
Valid keys: `+JSON.stringify(Object.keys(h),null,"  "));var s0=U0(V,p,S,t,o+"."+p,G4);if(s0)return s0}return null}return r(y)}function o0(h){switch(typeof h){case"number":case"string":case"undefined":return!0;case"boolean":return!h;case"object":if(Array.isArray(h))return h.every(o0);if(h===null||Q(h))return!0;var y=b(h);if(y){var C=y.call(h),T;if(y!==h.entries){while(!(T=C.next()).done)if(!o0(T.value))return!1}else while(!(T=C.next()).done){var S=T.value;if(S){if(!o0(S[1]))return!1}}}else return!1;return!0;default:return!1}}function b0(h,y){if(h==="symbol")return!0;if(!y)return!1;if(y["@@toStringTag"]==="Symbol")return!0;if(typeof Symbol==="function"&&y instanceof Symbol)return!0;return!1}function Zw(h){var y=typeof h;if(Array.isArray(h))return"array";if(h instanceof RegExp)return"object";if(b0(y,h))return"symbol";return y}function l(h){if(typeof h>"u"||h===null)return""+h;var y=Zw(h);if(y==="object"){if(h instanceof Date)return"date";else if(h instanceof RegExp)return"regexp"}return y}function xw(h){var y=l(h);switch(y){case"array":case"object":return"an "+y;case"boolean":case"date":case"regexp":return"a "+y;default:return y}}function k0(h){if(!h.constructor||!h.constructor.name)return d;return h.constructor.name}return _.checkPropTypes=D$,_.resetWarningCache=D$.resetWarningCache,_.PropTypes=_,_}});var $G=Hw((tI,P$)=>{var QG=N0(xG());JG=!0,P$.exports=h$()(QG.isElement,JG);var JG});var f$=Hw((eI,qG)=>{function _$(Q){var $,M,A="";if(typeof Q=="string"||typeof Q=="number")A+=Q;else if(typeof Q=="object")if(Array.isArray(Q)){var b=Q.length;for($=0;$<b;$++)Q[$]&&(M=_$(Q[$]))&&(A&&(A+=" "),A+=M)}else for(M in Q)Q[M]&&(A&&(A+=" "),A+=M);return A}function C$(){for(var Q,$,M=0,A="",b=arguments.length;M<b;M++)(Q=arguments[M])&&($=_$(Q))&&(A&&(A+=" "),A+=$);return A}qG.exports=C$,qG.exports.clsx=C$});var ax=Hw((E$)=>{Object.defineProperty(E$,"__esModule",{value:!0});E$.dontSetMe=WM;E$.findInArray=$M;E$.int=KM;E$.isFunction=qM;E$.isNum=UM;function $M(Q,$){for(let M=0,A=Q.length;M<A;M++)if($.apply($,[Q[M],M,Q]))return Q[M]}function qM(Q){return typeof Q==="function"||Object.prototype.toString.call(Q)==="[object Function]"}function UM(Q){return typeof Q==="number"&&!isNaN(Q)}function KM(Q){return parseInt(Q,10)}function WM(Q,$,M){if(Q[$])return Error(`Invalid prop ${$} passed to ${M} - do not set this, set it on the child.`)}});var m$=Hw((d$)=>{Object.defineProperty(d$,"__esModule",{value:!0});d$.browserPrefixToKey=S$;d$.browserPrefixToStyle=jM;d$.default=void 0;d$.getPrefix=N$;var UG=["Moz","Webkit","O","ms"];function N$(){let Q=arguments.length>0&&arguments[0]!==void 0?arguments[0]:"transform";if(typeof window>"u")return"";let $=window.document?.documentElement?.style;if(!$)return"";if(Q in $)return"";for(let M=0;M<UG.length;M++)if(S$(Q,UG[M])in $)return UG[M];return""}function S$(Q,$){return $?`${$}${AM(Q)}`:Q}function jM(Q,$){return $?`-${$.toLowerCase()}-${Q}`:Q}function AM(Q){let $="",M=!0;for(let A=0;A<Q.length;A++)if(M)$+=Q[A].toUpperCase(),M=!1;else if(Q[A]==="-")M=!0;else $+=Q[A];return $}var vb=d$.default=N$()});var K8=Hw((i$)=>{Object.defineProperty(i$,"__esModule",{value:!0});i$.addClassName=c$;i$.addEvent=kM;i$.addUserSelectStyles=TM;i$.createCSSTransform=EM;i$.createSVGTransform=NM;i$.getTouch=SM;i$.getTouchIdentifier=dM;i$.getTranslation=KG;i$.innerHeight=CM;i$.innerWidth=_M;i$.matchesSelector=a$;i$.matchesSelectorAndParentsTo=DM;i$.offsetXYFromParent=fM;i$.outerHeight=hM;i$.outerWidth=PM;i$.removeClassName=s$;i$.removeEvent=FM;i$.scheduleRemoveUserSelectStyles=mM;var P2=ax(),u$=y$(m$());function y$(Q,$){if(typeof WeakMap=="function")var M=new WeakMap,A=new WeakMap;return(y$=function(b,d){if(!d&&b&&b.__esModule)return b;var _,O,m={__proto__:null,default:b};if(b===null||typeof b!="object"&&typeof b!="function")return m;if(_=d?A:M){if(_.has(b))return _.get(b);_.set(b,m)}for(let r in b)r!=="default"&&{}.hasOwnProperty.call(b,r)&&((O=(_=Object.defineProperty)&&Object.getOwnPropertyDescriptor(b,r))&&(O.get||O.set)?_(m,r,O):m[r]=b[r]);return m})(Q,$)}var U8="";function a$(Q,$){if(!U8)U8=(0,P2.findInArray)(["matches","webkitMatchesSelector","mozMatchesSelector","msMatchesSelector","oMatchesSelector"],function(M){return(0,P2.isFunction)(Q[M])});if(!(0,P2.isFunction)(Q[U8]))return!1;return Q[U8]($)}function DM(Q,$,M){let A=Q;do{if(a$(A,$))return!0;if(A===M)return!1;A=A.parentNode}while(A);return!1}function kM(Q,$,M,A){if(!Q)return;let b={capture:!0,...A};if(Q.addEventListener)Q.addEventListener($,M,b);else if(Q.attachEvent)Q.attachEvent("on"+$,M);else Q["on"+$]=M}function FM(Q,$,M,A){if(!Q)return;let b={capture:!0,...A};if(Q.removeEventListener)Q.removeEventListener($,M,b);else if(Q.detachEvent)Q.detachEvent("on"+$,M);else Q["on"+$]=null}function hM(Q){let $=Q.clientHeight,M=Q.ownerDocument.defaultView.getComputedStyle(Q);return $+=(0,P2.int)(M.borderTopWidth),$+=(0,P2.int)(M.borderBottomWidth),$}function PM(Q){let $=Q.clientWidth,M=Q.ownerDocument.defaultView.getComputedStyle(Q);return $+=(0,P2.int)(M.borderLeftWidth),$+=(0,P2.int)(M.borderRightWidth),$}function CM(Q){let $=Q.clientHeight,M=Q.ownerDocument.defaultView.getComputedStyle(Q);return $-=(0,P2.int)(M.paddingTop),$-=(0,P2.int)(M.paddingBottom),$}function _M(Q){let $=Q.clientWidth,M=Q.ownerDocument.defaultView.getComputedStyle(Q);return $-=(0,P2.int)(M.paddingLeft),$-=(0,P2.int)(M.paddingRight),$}function fM(Q,$,M){let b=$===$.ownerDocument.body?{left:0,top:0}:$.getBoundingClientRect(),d=(Q.clientX+$.scrollLeft-b.left)/M,_=(Q.clientY+$.scrollTop-b.top)/M;return{x:d,y:_}}function EM(Q,$){let M=KG(Q,$,"px");return{[(0,u$.browserPrefixToKey)("transform",u$.default)]:M}}function NM(Q,$){return KG(Q,$,"")}function KG(Q,$,M){let{x:A,y:b}=Q,d=`translate(${A}${M},${b}${M})`;if($){let _=`${typeof $.x==="string"?$.x:$.x+M}`,O=`${typeof $.y==="string"?$.y:$.y+M}`;d=`translate(${_}, ${O})`+d}return d}function SM(Q,$){return Q.targetTouches&&(0,P2.findInArray)(Q.targetTouches,(M)=>$===M.identifier)||Q.changedTouches&&(0,P2.findInArray)(Q.changedTouches,(M)=>$===M.identifier)}function dM(Q){if(Q.targetTouches&&Q.targetTouches[0])return Q.targetTouches[0].identifier;if(Q.changedTouches&&Q.changedTouches[0])return Q.changedTouches[0].identifier}function TM(Q){if(!Q)return;let $=Q.getElementById("react-draggable-style-el");if(!$)$=Q.createElement("style"),$.type="text/css",$.id="react-draggable-style-el",$.innerHTML=`.react-draggable-transparent-selection *::-moz-selection {all: inherit;}
`,$.innerHTML+=`.react-draggable-transparent-selection *::selection {all: inherit;}
`,Q.getElementsByTagName("head")[0].appendChild($);if(Q.body)c$(Q.body,"react-draggable-transparent-selection")}function mM(Q){if(window.requestAnimationFrame)window.requestAnimationFrame(()=>{l$(Q)});else l$(Q)}function l$(Q){if(!Q)return;try{if(Q.body)s$(Q.body,"react-draggable-transparent-selection");if(Q.selection)Q.selection.empty();else{let $=(Q.defaultView||window).getSelection();if($&&$.type!=="Caret")$.removeAllRanges()}}catch($){}}function c$(Q,$){if(Q.classList)Q.classList.add($);else if(!Q.className.match(new RegExp(`(?:^|\\s)${$}(?!\\S)`)))Q.className+=` ${$}`}function s$(Q,$){if(Q.classList)Q.classList.remove($);else Q.className=Q.className.replace(new RegExp(`(?:^|\\s)${$}(?!\\S)`,"g"),"")}});var MG=Hw((r$)=>{Object.defineProperty(r$,"__esModule",{value:!0});r$.canDragX=BY;r$.canDragY=XY;r$.createCoreData=JY;r$.createDraggableData=QY;r$.getBoundPosition=GY;r$.getControlPosition=HY;r$.snapToGrid=ZY;var C2=ax(),B4=K8();function GY(Q,$,M){if(!Q.props.bounds)return[$,M];let{bounds:A}=Q.props;A=typeof A==="string"?A:$Y(A);let b=WG(Q);if(typeof A==="string"){let{ownerDocument:d}=b,_=d.defaultView,O;if(A==="parent")O=b.parentNode;else O=b.getRootNode().querySelector(A);if(!(O instanceof _.HTMLElement))throw Error('Bounds selector "'+A+'" could not find an element.');let m=O,r=_.getComputedStyle(b),P=_.getComputedStyle(m);A={left:-b.offsetLeft+(0,C2.int)(P.paddingLeft)+(0,C2.int)(r.marginLeft),top:-b.offsetTop+(0,C2.int)(P.paddingTop)+(0,C2.int)(r.marginTop),right:(0,B4.innerWidth)(m)-(0,B4.outerWidth)(b)-b.offsetLeft+(0,C2.int)(P.paddingRight)-(0,C2.int)(r.marginRight),bottom:(0,B4.innerHeight)(m)-(0,B4.outerHeight)(b)-b.offsetTop+(0,C2.int)(P.paddingBottom)-(0,C2.int)(r.marginBottom)}}if((0,C2.isNum)(A.right))$=Math.min($,A.right);if((0,C2.isNum)(A.bottom))M=Math.min(M,A.bottom);if((0,C2.isNum)(A.left))$=Math.max($,A.left);if((0,C2.isNum)(A.top))M=Math.max(M,A.top);return[$,M]}function ZY(Q,$,M){let A=Math.round($/Q[0])*Q[0],b=Math.round(M/Q[1])*Q[1];return[A,b]}function BY(Q){return Q.props.axis==="both"||Q.props.axis==="x"}function XY(Q){return Q.props.axis==="both"||Q.props.axis==="y"}function HY(Q,$,M){let A=typeof $==="number"?(0,B4.getTouch)(Q,$):null;if(typeof $==="number"&&!A)return null;let b=WG(M),d=M.props.offsetParent||b.offsetParent||b.ownerDocument.body;return(0,B4.offsetXYFromParent)(A||Q,d,M.props.scale)}function JY(Q,$,M){let A=!(0,C2.isNum)(Q.lastX),b=WG(Q);if(A)return{node:b,deltaX:0,deltaY:0,lastX:$,lastY:M,x:$,y:M};else return{node:b,deltaX:$-Q.lastX,deltaY:M-Q.lastY,lastX:Q.lastX,lastY:Q.lastY,x:$,y:M}}function QY(Q,$){let M=Q.props.scale;return{node:$.node,x:Q.state.x+$.deltaX/M,y:Q.state.y+$.deltaY/M,deltaX:$.deltaX/M,deltaY:$.deltaY/M,lastX:Q.state.x,lastY:Q.state.y}}function $Y(Q){return{left:Q.left,top:Q.top,right:Q.right,bottom:Q.bottom}}function WG(Q){let $=Q.findDOMNode();if(!$)throw Error("<DraggableCore>: Unmounted during event!");return $}});var YG=Hw((n$)=>{Object.defineProperty(n$,"__esModule",{value:!0});n$.default=IY;function IY(){}});var e$=Hw((t$)=>{var RY=N0(q5()),VY=N0($8());Object.defineProperty(t$,"__esModule",{value:!0});t$.default=void 0;var LG=o$(RY),ew=bG($G()),jY=bG(VY),lw=K8(),xv=MG(),IG=ax(),cx=bG(YG());function bG(Q){return Q&&Q.__esModule?Q:{default:Q}}function o$(Q,$){if(typeof WeakMap=="function")var M=new WeakMap,A=new WeakMap;return(o$=function(b,d){if(!d&&b&&b.__esModule)return b;var _,O,m={__proto__:null,default:b};if(b===null||typeof b!="object"&&typeof b!="function")return m;if(_=d?A:M){if(_.has(b))return _.get(b);_.set(b,m)}for(let r in b)r!=="default"&&{}.hasOwnProperty.call(b,r)&&((O=(_=Object.defineProperty)&&Object.getOwnPropertyDescriptor(b,r))&&(O.get||O.set)?_(m,r,O):m[r]=b[r]);return m})(Q,$)}function w2(Q,$,M){return($=AY($))in Q?Object.defineProperty(Q,$,{value:M,enumerable:!0,configurable:!0,writable:!0}):Q[$]=M,Q}function AY(Q){var $=OY(Q,"string");return typeof $=="symbol"?$:$+""}function OY(Q,$){if(typeof Q!="object"||!Q)return Q;var M=Q[Symbol.toPrimitive];if(M!==void 0){var A=M.call(Q,$||"default");if(typeof A!="object")return A;throw TypeError("@@toPrimitive must return a primitive value.")}return($==="string"?String:Number)(Q)}var H1={touch:{start:"touchstart",move:"touchmove",stop:"touchend"},mouse:{start:"mousedown",move:"mousemove",stop:"mouseup"}},zv=H1.mouse;class sx extends LG.Component{constructor(){super(...arguments);w2(this,"dragging",!1),w2(this,"lastX",NaN),w2(this,"lastY",NaN),w2(this,"touchIdentifier",null),w2(this,"mounted",!1),w2(this,"handleDragStart",(Q)=>{if(this.props.onMouseDown(Q),!this.props.allowAnyClick&&typeof Q.button==="number"&&Q.button!==0)return!1;let $=this.findDOMNode();if(!$||!$.ownerDocument||!$.ownerDocument.body)throw Error("<DraggableCore> not mounted on DragStart!");let{ownerDocument:M}=$;if(this.props.disabled||!(Q.target instanceof M.defaultView.Node)||this.props.handle&&!(0,lw.matchesSelectorAndParentsTo)(Q.target,this.props.handle,$)||this.props.cancel&&(0,lw.matchesSelectorAndParentsTo)(Q.target,this.props.cancel,$))return;if(Q.type==="touchstart"&&!this.props.allowMobileScroll)Q.preventDefault();let A=(0,lw.getTouchIdentifier)(Q);this.touchIdentifier=A;let b=(0,xv.getControlPosition)(Q,A,this);if(b==null)return;let{x:d,y:_}=b,O=(0,xv.createCoreData)(this,d,_);if((0,cx.default)("DraggableCore: handleDragStart: %j",O),(0,cx.default)("calling",this.props.onStart),this.props.onStart(Q,O)===!1||this.mounted===!1)return;if(this.props.enableUserSelectHack)(0,lw.addUserSelectStyles)(M);this.dragging=!0,this.lastX=d,this.lastY=_,(0,lw.addEvent)(M,zv.move,this.handleDrag),(0,lw.addEvent)(M,zv.stop,this.handleDragStop)}),w2(this,"handleDrag",(Q)=>{let $=(0,xv.getControlPosition)(Q,this.touchIdentifier,this);if($==null)return;let{x:M,y:A}=$;if(Array.isArray(this.props.grid)){let _=M-this.lastX,O=A-this.lastY;if([_,O]=(0,xv.snapToGrid)(this.props.grid,_,O),!_&&!O)return;M=this.lastX+_,A=this.lastY+O}let b=(0,xv.createCoreData)(this,M,A);if((0,cx.default)("DraggableCore: handleDrag: %j",b),this.props.onDrag(Q,b)===!1||this.mounted===!1){try{this.handleDragStop(new MouseEvent("mouseup"))}catch(_){let O=document.createEvent("MouseEvents");O.initMouseEvent("mouseup",!0,!0,window,0,0,0,0,0,!1,!1,!1,!1,0,null),this.handleDragStop(O)}return}this.lastX=M,this.lastY=A}),w2(this,"handleDragStop",(Q)=>{if(!this.dragging)return;let $=(0,xv.getControlPosition)(Q,this.touchIdentifier,this);if($==null)return;let{x:M,y:A}=$;if(Array.isArray(this.props.grid)){let O=M-this.lastX||0,m=A-this.lastY||0;[O,m]=(0,xv.snapToGrid)(this.props.grid,O,m),M=this.lastX+O,A=this.lastY+m}let b=(0,xv.createCoreData)(this,M,A);if(this.props.onStop(Q,b)===!1||this.mounted===!1)return!1;let _=this.findDOMNode();if(_){if(this.props.enableUserSelectHack)(0,lw.scheduleRemoveUserSelectStyles)(_.ownerDocument)}if((0,cx.default)("DraggableCore: handleDragStop: %j",b),this.dragging=!1,this.lastX=NaN,this.lastY=NaN,_)(0,cx.default)("DraggableCore: Removing handlers"),(0,lw.removeEvent)(_.ownerDocument,zv.move,this.handleDrag),(0,lw.removeEvent)(_.ownerDocument,zv.stop,this.handleDragStop)}),w2(this,"onMouseDown",(Q)=>{return zv=H1.mouse,this.handleDragStart(Q)}),w2(this,"onMouseUp",(Q)=>{return zv=H1.mouse,this.handleDragStop(Q)}),w2(this,"onTouchStart",(Q)=>{return zv=H1.touch,this.handleDragStart(Q)}),w2(this,"onTouchEnd",(Q)=>{return zv=H1.touch,this.handleDragStop(Q)})}componentDidMount(){this.mounted=!0;let Q=this.findDOMNode();if(Q)(0,lw.addEvent)(Q,H1.touch.start,this.onTouchStart,{passive:!1})}componentWillUnmount(){this.mounted=!1;let Q=this.findDOMNode();if(Q){let{ownerDocument:$}=Q;if((0,lw.removeEvent)($,H1.mouse.move,this.handleDrag),(0,lw.removeEvent)($,H1.touch.move,this.handleDrag),(0,lw.removeEvent)($,H1.mouse.stop,this.handleDragStop),(0,lw.removeEvent)($,H1.touch.stop,this.handleDragStop),(0,lw.removeEvent)(Q,H1.touch.start,this.onTouchStart,{passive:!1}),this.props.enableUserSelectHack)(0,lw.scheduleRemoveUserSelectStyles)($)}}findDOMNode(){return this.props?.nodeRef?this.props?.nodeRef?.current:jY.default.findDOMNode(this)}render(){return LG.cloneElement(LG.Children.only(this.props.children),{onMouseDown:this.onMouseDown,onMouseUp:this.onMouseUp,onTouchEnd:this.onTouchEnd})}}t$.default=sx;w2(sx,"displayName","DraggableCore");w2(sx,"propTypes",{allowAnyClick:ew.default.bool,allowMobileScroll:ew.default.bool,children:ew.default.node.isRequired,disabled:ew.default.bool,enableUserSelectHack:ew.default.bool,offsetParent:function(Q,$){if(Q[$]&&Q[$].nodeType!==1)throw Error("Draggable's offsetParent must be a DOM Node.")},grid:ew.default.arrayOf(ew.default.number),handle:ew.default.string,cancel:ew.default.string,nodeRef:ew.default.object,onStart:ew.default.func,onDrag:ew.default.func,onStop:ew.default.func,onMouseDown:ew.default.func,scale:ew.default.number,className:IG.dontSetMe,style:IG.dontSetMe,transform:IG.dontSetMe});w2(sx,"defaultProps",{allowAnyClick:!1,allowMobileScroll:!1,disabled:!1,enableUserSelectHack:!0,onStart:function(){},onDrag:function(){},onStop:function(){},onMouseDown:function(){},scale:1})});var xq=Hw((OG)=>{var PY=N0(q5()),CY=N0($8());Object.defineProperty(OG,"__esModule",{value:!0});Object.defineProperty(OG,"DraggableCore",{enumerable:!0,get:function(){return Y8.default}});OG.default=void 0;var W8=vq(PY),gw=L8($G()),DY=L8(CY),kY=f$(),wq=K8(),X4=MG(),jG=ax(),Y8=L8(e$()),M8=L8(YG());function L8(Q){return Q&&Q.__esModule?Q:{default:Q}}function vq(Q,$){if(typeof WeakMap=="function")var M=new WeakMap,A=new WeakMap;return(vq=function(b,d){if(!d&&b&&b.__esModule)return b;var _,O,m={__proto__:null,default:b};if(b===null||typeof b!="object"&&typeof b!="function")return m;if(_=d?A:M){if(_.has(b))return _.get(b);_.set(b,m)}for(let r in b)r!=="default"&&{}.hasOwnProperty.call(b,r)&&((O=(_=Object.defineProperty)&&Object.getOwnPropertyDescriptor(b,r))&&(O.get||O.set)?_(m,r,O):m[r]=b[r]);return m})(Q,$)}function AG(){return AG=Object.assign?Object.assign.bind():function(Q){for(var $=1;$<arguments.length;$++){var M=arguments[$];for(var A in M)({}).hasOwnProperty.call(M,A)&&(Q[A]=M[A])}return Q},AG.apply(null,arguments)}function H4(Q,$,M){return($=FY($))in Q?Object.defineProperty(Q,$,{value:M,enumerable:!0,configurable:!0,writable:!0}):Q[$]=M,Q}function FY(Q){var $=hY(Q,"string");return typeof $=="symbol"?$:$+""}function hY(Q,$){if(typeof Q!="object"||!Q)return Q;var M=Q[Symbol.toPrimitive];if(M!==void 0){var A=M.call(Q,$||"default");if(typeof A!="object")return A;throw TypeError("@@toPrimitive must return a primitive value.")}return($==="string"?String:Number)(Q)}class ix extends W8.Component{static getDerivedStateFromProps(Q,$){let{position:M}=Q,{prevPropsPosition:A}=$;if(M&&(!A||M.x!==A.x||M.y!==A.y))return(0,M8.default)("Draggable: getDerivedStateFromProps %j",{position:M,prevPropsPosition:A}),{x:M.x,y:M.y,prevPropsPosition:{...M}};return null}constructor(Q){super(Q);if(H4(this,"onDragStart",($,M)=>{if((0,M8.default)("Draggable: onDragStart: %j",M),this.props.onStart($,(0,X4.createDraggableData)(this,M))===!1)return!1;this.setState({dragging:!0,dragged:!0})}),H4(this,"onDrag",($,M)=>{if(!this.state.dragging)return!1;(0,M8.default)("Draggable: onDrag: %j",M);let A=(0,X4.createDraggableData)(this,M),b={x:A.x,y:A.y,slackX:0,slackY:0};if(this.props.bounds){let{x:_,y:O}=b;b.x+=this.state.slackX,b.y+=this.state.slackY;let[m,r]=(0,X4.getBoundPosition)(this,b.x,b.y);b.x=m,b.y=r,b.slackX=this.state.slackX+(_-b.x),b.slackY=this.state.slackY+(O-b.y),A.x=b.x,A.y=b.y,A.deltaX=b.x-this.state.x,A.deltaY=b.y-this.state.y}if(this.props.onDrag($,A)===!1)return!1;this.setState(b)}),H4(this,"onDragStop",($,M)=>{if(!this.state.dragging)return!1;if(this.props.onStop($,(0,X4.createDraggableData)(this,M))===!1)return!1;(0,M8.default)("Draggable: onDragStop: %j",M);let b={dragging:!1,slackX:0,slackY:0};if(Boolean(this.props.position)){let{x:_,y:O}=this.props.position;b.x=_,b.y=O}this.setState(b)}),this.state={dragging:!1,dragged:!1,x:Q.position?Q.position.x:Q.defaultPosition.x,y:Q.position?Q.position.y:Q.defaultPosition.y,prevPropsPosition:{...Q.position},slackX:0,slackY:0,isElementSVG:!1},Q.position&&!(Q.onDrag||Q.onStop))console.warn("A `position` was applied to this <Draggable>, without drag handlers. This will make this component effectively undraggable. Please attach `onDrag` or `onStop` handlers so you can adjust the `position` of this element.")}componentDidMount(){if(typeof window.SVGElement<"u"&&this.findDOMNode()instanceof window.SVGElement)this.setState({isElementSVG:!0})}componentWillUnmount(){if(this.state.dragging)this.setState({dragging:!1})}findDOMNode(){return this.props?.nodeRef?.current??DY.default.findDOMNode(this)}render(){let{axis:Q,bounds:$,children:M,defaultPosition:A,defaultClassName:b,defaultClassNameDragging:d,defaultClassNameDragged:_,position:O,positionOffset:m,scale:r,...P}=this.props,j={},E=null,Q0=!Boolean(O)||this.state.dragging,K0=O||A,f0={x:(0,X4.canDragX)(this)&&Q0?this.state.x:K0.x,y:(0,X4.canDragY)(this)&&Q0?this.state.y:K0.y};if(this.state.isElementSVG)E=(0,wq.createSVGTransform)(f0,m);else j=(0,wq.createCSSTransform)(f0,m);let Aw=(0,kY.clsx)(M.props.className||"",b,{[d]:this.state.dragging,[_]:this.state.dragged});return W8.createElement(Y8.default,AG({},P,{onStart:this.onDragStart,onDrag:this.onDrag,onStop:this.onDragStop}),W8.cloneElement(W8.Children.only(M),{className:Aw,style:{...M.props.style,...j},transform:E}))}}OG.default=ix;H4(ix,"displayName","Draggable");H4(ix,"propTypes",{...Y8.default.propTypes,axis:gw.default.oneOf(["both","x","y","none"]),bounds:gw.default.oneOfType([gw.default.shape({left:gw.default.number,right:gw.default.number,top:gw.default.number,bottom:gw.default.number}),gw.default.string,gw.default.oneOf([!1])]),defaultClassName:gw.default.string,defaultClassNameDragging:gw.default.string,defaultClassNameDragged:gw.default.string,defaultPosition:gw.default.shape({x:gw.default.number,y:gw.default.number}),positionOffset:gw.default.shape({x:gw.default.oneOfType([gw.default.number,gw.default.string]),y:gw.default.oneOfType([gw.default.number,gw.default.string])}),position:gw.default.shape({x:gw.default.number,y:gw.default.number}),className:jG.dontSetMe,style:jG.dontSetMe,transform:jG.dontSetMe});H4(ix,"defaultProps",{...Y8.default.defaultProps,axis:"both",bounds:!1,defaultClassName:"react-draggable",defaultClassNameDragging:"react-draggable-dragging",defaultClassNameDragged:"react-draggable-dragged",defaultPosition:{x:0,y:0},scale:1})});var Gq=Hw((Xb,I8)=>{var{default:zq,DraggableCore:_Y}=xq();I8.exports=zq;I8.exports.default=zq;I8.exports.DraggableCore=_Y});var v2=Hw((fY)=>{var pv=N0(q5());(function(){function Q(V){if(V==null)return null;if(typeof V==="function")return V.$$typeof===l?null:V.displayName||V.name||null;if(typeof V==="string")return V;switch(V){case K0:return"Fragment";case Aw:return"Profiler";case f0:return"StrictMode";case x2:return"Suspense";case $2:return"SuspenseList";case Zw:return"Activity"}if(typeof V==="object")switch(typeof V.tag==="number"&&console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."),V.$$typeof){case Q0:return"Portal";case $w:return V.displayName||"Context";case Cw:return(V._context.displayName||"Context")+".Consumer";case c0:var a=V.render;return V=V.displayName,V||(V=a.displayName||a.name||"",V=V!==""?"ForwardRef("+V+")":"ForwardRef"),V;case o0:return a=V.displayName||null,a!==null?a:Q(V.type)||"Memo";case b0:a=V._payload,V=V._init;try{return Q(V(a))}catch(v0){}}return null}function $(V){return""+V}function M(V){try{$(V);var a=!1}catch(U0){a=!0}if(a){a=console;var v0=a.error,p=typeof Symbol==="function"&&Symbol.toStringTag&&V[Symbol.toStringTag]||V.constructor.name||"Object";return v0.call(a,"The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",p),$(V)}}function A(V){if(V===K0)return"<>";if(typeof V==="object"&&V!==null&&V.$$typeof===b0)return"<...>";try{var a=Q(V);return a?"<"+a+">":"<...>"}catch(v0){return"<...>"}}function b(){var V=xw.A;return V===null?null:V.getOwner()}function d(){return Error("react-stack-top-frame")}function _(V){if(k0.call(V,"key")){var a=Object.getOwnPropertyDescriptor(V,"key").get;if(a&&a.isReactWarning)return!1}return V.key!==void 0}function O(V,a){function v0(){C||(C=!0,console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",a))}v0.isReactWarning=!0,Object.defineProperty(V,"key",{get:v0,configurable:!0})}function m(){var V=Q(this.type);return T[V]||(T[V]=!0,console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.")),V=this.props.ref,V!==void 0?V:null}function r(V,a,v0,p,U0,s0){var E0=v0.ref;return V={$$typeof:X0,type:V,key:a,props:v0,_owner:p},(E0!==void 0?E0:null)!==null?Object.defineProperty(V,"ref",{enumerable:!1,get:m}):Object.defineProperty(V,"ref",{enumerable:!1,value:null}),V._store={},Object.defineProperty(V._store,"validated",{configurable:!1,enumerable:!1,writable:!0,value:0}),Object.defineProperty(V,"_debugInfo",{configurable:!1,enumerable:!1,writable:!0,value:null}),Object.defineProperty(V,"_debugStack",{configurable:!1,enumerable:!1,writable:!0,value:U0}),Object.defineProperty(V,"_debugTask",{configurable:!1,enumerable:!1,writable:!0,value:s0}),Object.freeze&&(Object.freeze(V.props),Object.freeze(V)),V}function P(V,a,v0,p,U0,s0){var E0=a.children;if(E0!==void 0)if(p)if(h(E0)){for(p=0;p<E0.length;p++)j(E0[p]);Object.freeze&&Object.freeze(E0)}else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");else j(E0);if(k0.call(a,"key")){E0=Q(V);var yw=Object.keys(a).filter(function(o2){return o2!=="key"});p=0<yw.length?"{key: someKey, "+yw.join(": ..., ")+": ...}":"{key: someKey}",o[E0+p]||(yw=0<yw.length?"{"+yw.join(": ..., ")+": ...}":"{}",console.error(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`,p,E0,yw,E0),o[E0+p]=!0)}if(E0=null,v0!==void 0&&(M(v0),E0=""+v0),_(a)&&(M(a.key),E0=""+a.key),"key"in a){v0={};for(var z2 in a)z2!=="key"&&(v0[z2]=a[z2])}else v0=a;return E0&&O(v0,typeof V==="function"?V.displayName||V.name||"Unknown":V),r(V,E0,v0,b(),U0,s0)}function j(V){E(V)?V._store&&(V._store.validated=1):typeof V==="object"&&V!==null&&V.$$typeof===b0&&(V._payload.status==="fulfilled"?E(V._payload.value)&&V._payload.value._store&&(V._payload.value._store.validated=1):V._store&&(V._store.validated=1))}function E(V){return typeof V==="object"&&V!==null&&V.$$typeof===X0}var X0=Symbol.for("react.transitional.element"),Q0=Symbol.for("react.portal"),K0=Symbol.for("react.fragment"),f0=Symbol.for("react.strict_mode"),Aw=Symbol.for("react.profiler"),Cw=Symbol.for("react.consumer"),$w=Symbol.for("react.context"),c0=Symbol.for("react.forward_ref"),x2=Symbol.for("react.suspense"),$2=Symbol.for("react.suspense_list"),o0=Symbol.for("react.memo"),b0=Symbol.for("react.lazy"),Zw=Symbol.for("react.activity"),l=Symbol.for("react.client.reference"),xw=pv.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,k0=Object.prototype.hasOwnProperty,h=Array.isArray,y=console.createTask?console.createTask:function(){return null};pv={react_stack_bottom_frame:function(V){return V()}};var C,T={},S=pv.react_stack_bottom_frame.bind(pv,d)(),t=y(A(d)),o={};fY.Fragment=K0,fY.jsxDEV=function(V,a,v0,p){var U0=1e4>xw.recentlyCreatedOwnerStacks++;return P(V,a,v0,p,U0?Error("react-stack-top-frame"):S,U0?y(A(V)):t)}})()});var $$=`/*! tailwindcss v4.1.17 | MIT License | https://tailwindcss.com */
@layer properties {
  @supports (((-webkit-hyphens: none)) and (not (margin-trim: inline))) or
    ((-moz-orient: inline) and (not (color: rgb(from red r g b)))) {
    *,
    :before,
    :after,
    ::backdrop {
      --tw-rotate-x: initial;
      --tw-rotate-y: initial;
      --tw-rotate-z: initial;
      --tw-skew-x: initial;
      --tw-skew-y: initial;
      --tw-border-style: solid;
      --tw-gradient-position: initial;
      --tw-gradient-from: #0000;
      --tw-gradient-via: #0000;
      --tw-gradient-to: #0000;
      --tw-gradient-stops: initial;
      --tw-gradient-via-stops: initial;
      --tw-gradient-from-position: 0%;
      --tw-gradient-via-position: 50%;
      --tw-gradient-to-position: 100%;
      --tw-font-weight: initial;
      --tw-tracking: initial;
      --tw-ordinal: initial;
      --tw-slashed-zero: initial;
      --tw-numeric-figure: initial;
      --tw-numeric-spacing: initial;
      --tw-numeric-fraction: initial;
      --tw-shadow: 0 0 #0000;
      --tw-shadow-color: initial;
      --tw-shadow-alpha: 100%;
      --tw-inset-shadow: 0 0 #0000;
      --tw-inset-shadow-color: initial;
      --tw-inset-shadow-alpha: 100%;
      --tw-ring-color: initial;
      --tw-ring-shadow: 0 0 #0000;
      --tw-inset-ring-color: initial;
      --tw-inset-ring-shadow: 0 0 #0000;
      --tw-ring-inset: initial;
      --tw-ring-offset-width: 0px;
      --tw-ring-offset-color: #fff;
      --tw-ring-offset-shadow: 0 0 #0000;
      --tw-outline-style: solid;
      --tw-blur: initial;
      --tw-brightness: initial;
      --tw-contrast: initial;
      --tw-grayscale: initial;
      --tw-hue-rotate: initial;
      --tw-invert: initial;
      --tw-opacity: initial;
      --tw-saturate: initial;
      --tw-sepia: initial;
      --tw-drop-shadow: initial;
      --tw-drop-shadow-color: initial;
      --tw-drop-shadow-alpha: 100%;
      --tw-drop-shadow-size: initial;
      --tw-duration: initial;
      --tw-ease: initial;
      --tw-content: '';
    }
  }
}
@layer theme {
  :root,
  :host {
    --font-sans:
      ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
      'Segoe UI Symbol', 'Noto Color Emoji';
    --font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
    --font-mono:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
    --color-red-50: oklch(97.1% 0.013 17.38);
    --color-red-100: oklch(93.6% 0.032 17.717);
    --color-red-300: oklch(80.8% 0.114 19.571);
    --color-red-400: oklch(70.4% 0.191 22.216);
    --color-red-500: oklch(63.7% 0.237 25.331);
    --color-red-600: oklch(57.7% 0.245 27.325);
    --color-red-700: oklch(50.5% 0.213 27.518);
    --color-orange-400: oklch(75% 0.183 55.934);
    --color-amber-200: oklch(92.4% 0.12 95.746);
    --color-amber-300: oklch(87.9% 0.169 91.605);
    --color-amber-400: oklch(82.8% 0.189 84.429);
    --color-yellow-300: oklch(90.5% 0.182 98.111);
    --color-yellow-400: oklch(85.2% 0.199 91.936);
    --color-yellow-500: oklch(79.5% 0.184 86.047);
    --color-yellow-600: oklch(68.1% 0.162 75.834);
    --color-lime-300: oklch(89.7% 0.196 126.665);
    --color-green-200: oklch(92.5% 0.084 155.995);
    --color-green-300: oklch(87.1% 0.15 154.449);
    --color-green-400: oklch(79.2% 0.209 151.711);
    --color-green-500: oklch(72.3% 0.219 149.579);
    --color-green-700: oklch(52.7% 0.154 150.069);
    --color-green-900: oklch(39.3% 0.095 152.535);
    --color-teal-200: oklch(91% 0.096 180.426);
    --color-blue-50: oklch(97% 0.014 254.604);
    --color-blue-200: oklch(88.2% 0.059 254.128);
    --color-blue-500: oklch(62.3% 0.214 259.815);
    --color-blue-600: oklch(54.6% 0.245 262.881);
    --color-blue-700: oklch(48.8% 0.243 264.376);
    --color-blue-800: oklch(42.4% 0.199 265.638);
    --color-indigo-500: oklch(58.5% 0.233 277.117);
    --color-pink-500: oklch(65.6% 0.241 354.308);
    --color-slate-800: oklch(27.9% 0.041 260.031);
    --color-slate-900: oklch(20.8% 0.042 265.755);
    --color-gray-50: oklch(98.5% 0.002 247.839);
    --color-gray-100: oklch(96.7% 0.003 264.542);
    --color-gray-200: oklch(92.8% 0.006 264.531);
    --color-gray-300: oklch(87.2% 0.01 258.338);
    --color-gray-400: oklch(70.7% 0.022 261.325);
    --color-gray-500: oklch(55.1% 0.027 264.364);
    --color-gray-600: oklch(44.6% 0.03 256.802);
    --color-gray-700: oklch(37.3% 0.034 259.733);
    --color-gray-800: oklch(27.8% 0.033 256.848);
    --color-gray-900: oklch(21% 0.034 264.665);
    --color-gray-950: oklch(13% 0.028 261.692);
    --color-zinc-200: oklch(92% 0.004 286.32);
    --color-zinc-950: oklch(14.1% 0.005 285.823);
    --color-neutral-50: oklch(98.5% 0 0);
    --color-neutral-200: oklch(92.2% 0 0);
    --color-neutral-300: oklch(87% 0 0);
    --color-neutral-400: oklch(70.8% 0 0);
    --color-neutral-500: oklch(55.6% 0 0);
    --color-neutral-700: oklch(37.1% 0 0);
    --color-neutral-800: oklch(26.9% 0 0);
    --color-neutral-900: oklch(20.5% 0 0);
    --color-neutral-950: oklch(14.5% 0 0);
    --color-stone-50: oklch(98.5% 0.001 106.423);
    --color-stone-100: oklch(97% 0.001 106.424);
    --color-stone-200: oklch(92.3% 0.003 48.717);
    --color-stone-300: oklch(86.9% 0.005 56.366);
    --color-stone-800: oklch(26.8% 0.007 34.298);
    --color-stone-900: oklch(21.6% 0.006 56.043);
    --color-black: #000;
    --color-white: #fff;
    --spacing: 0.25rem;
    --container-sm: 24rem;
    --container-md: 28rem;
    --container-lg: 32rem;
    --container-2xl: 42rem;
    --container-4xl: 56rem;
    --container-5xl: 64rem;
    --container-7xl: 80rem;
    --text-xs: 0.75rem;
    --text-xs--line-height: calc(1 / 0.75);
    --text-sm: 0.875rem;
    --text-sm--line-height: calc(1.25 / 0.875);
    --text-base: 1rem;
    --text-base--line-height: calc(1.5 / 1);
    --text-lg: 1.125rem;
    --text-lg--line-height: calc(1.75 / 1.125);
    --text-xl: 1.25rem;
    --text-xl--line-height: calc(1.75 / 1.25);
    --text-2xl: 1.5rem;
    --text-2xl--line-height: calc(2 / 1.5);
    --text-3xl: 1.875rem;
    --text-3xl--line-height: calc(2.25 / 1.875);
    --text-4xl: 2.25rem;
    --text-4xl--line-height: calc(2.5 / 2.25);
    --text-5xl: 3rem;
    --text-5xl--line-height: 1;
    --text-6xl: 3.75rem;
    --text-6xl--line-height: 1;
    --text-7xl: 4.5rem;
    --text-7xl--line-height: 1;
    --font-weight-extralight: 200;
    --font-weight-light: 300;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;
    --font-weight-extrabold: 800;
    --font-weight-black: 900;
    --tracking-wide: 0.025em;
    --leading-tight: 1.25;
    --leading-snug: 1.375;
    --leading-loose: 2;
    --radius-xs: 0.125rem;
    --radius-sm: 0.25rem;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    --ease-in: cubic-bezier(0.4, 0, 1, 1);
    --ease-out: cubic-bezier(0, 0, 0.2, 1);
    --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
    --default-transition-duration: 0.15s;
    --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    --default-font-family: var(--font-sans);
    --default-mono-font-family: var(--font-mono);
  }
}
@layer base {
  *,
  :after,
  :before,
  ::backdrop {
    box-sizing: border-box;
    border: 0 solid;
    margin: 0;
    padding: 0;
  }
  ::file-selector-button {
    box-sizing: border-box;
    border: 0 solid;
    margin: 0;
    padding: 0;
  }
  html,
  :host {
    -webkit-text-size-adjust: 100%;
    tab-size: 4;
    line-height: 1.5;
    font-family: var(
      --default-font-family,
      ui-sans-serif,
      system-ui,
      sans-serif,
      'Apple Color Emoji',
      'Segoe UI Emoji',
      'Segoe UI Symbol',
      'Noto Color Emoji'
    );
    font-feature-settings: var(--default-font-feature-settings, normal);
    font-variation-settings: var(--default-font-variation-settings, normal);
    -webkit-tap-highlight-color: transparent;
  }
  hr {
    height: 0;
    color: inherit;
    border-top-width: 1px;
  }
  abbr:where([title]) {
    -webkit-text-decoration: underline dotted;
    text-decoration: underline dotted;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-size: inherit;
    font-weight: inherit;
  }
  a {
    color: inherit;
    -webkit-text-decoration: inherit;
    -webkit-text-decoration: inherit;
    -webkit-text-decoration: inherit;
    text-decoration: inherit;
  }
  b,
  strong {
    font-weight: bolder;
  }
  code,
  kbd,
  samp,
  pre {
    font-family: var(
      --default-mono-font-family,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      'Liberation Mono',
      'Courier New',
      monospace
    );
    font-feature-settings: var(--default-mono-font-feature-settings, normal);
    font-variation-settings: var(--default-mono-font-variation-settings, normal);
    font-size: 1em;
  }
  small {
    font-size: 80%;
  }
  sub,
  sup {
    vertical-align: baseline;
    font-size: 75%;
    line-height: 0;
    position: relative;
  }
  sub {
    bottom: -0.25em;
  }
  sup {
    top: -0.5em;
  }
  table {
    text-indent: 0;
    border-color: inherit;
    border-collapse: collapse;
  }
  :-moz-focusring {
    outline: auto;
  }
  progress {
    vertical-align: baseline;
  }
  summary {
    display: list-item;
  }
  ol,
  ul,
  menu {
    list-style: none;
  }
  img,
  svg,
  video,
  canvas,
  audio,
  iframe,
  embed,
  object {
    vertical-align: middle;
    display: block;
  }
  img,
  video {
    max-width: 100%;
    height: auto;
  }
  button,
  input,
  select,
  optgroup,
  textarea {
    font: inherit;
    font-feature-settings: inherit;
    font-variation-settings: inherit;
    letter-spacing: inherit;
    color: inherit;
    opacity: 1;
    background-color: #0000;
    border-radius: 0;
  }
  ::file-selector-button {
    font: inherit;
    font-feature-settings: inherit;
    font-variation-settings: inherit;
    letter-spacing: inherit;
    color: inherit;
    opacity: 1;
    background-color: #0000;
    border-radius: 0;
  }
  :where(select:is([multiple], [size])) optgroup {
    font-weight: bolder;
  }
  :where(select:is([multiple], [size])) optgroup option {
    padding-inline-start: 20px;
  }
  ::file-selector-button {
    margin-inline-end: 4px;
  }
  ::placeholder {
    opacity: 1;
  }
  @supports (not ((-webkit-appearance: -apple-pay-button))) or (contain-intrinsic-size: 1px) {
    ::placeholder {
      color: currentColor;
    }
    @supports (color: color-mix(in lab, red, red)) {
      ::placeholder {
        color: color-mix(in oklab, currentcolor 50%, transparent);
      }
    }
  }
  textarea {
    resize: vertical;
  }
  ::-webkit-search-decoration {
    -webkit-appearance: none;
  }
  ::-webkit-date-and-time-value {
    min-height: 1lh;
    text-align: inherit;
  }
  ::-webkit-datetime-edit {
    display: inline-flex;
  }
  ::-webkit-datetime-edit-fields-wrapper {
    padding: 0;
  }
  ::-webkit-datetime-edit {
    padding-block: 0;
  }
  ::-webkit-datetime-edit-year-field {
    padding-block: 0;
  }
  ::-webkit-datetime-edit-month-field {
    padding-block: 0;
  }
  ::-webkit-datetime-edit-day-field {
    padding-block: 0;
  }
  ::-webkit-datetime-edit-hour-field {
    padding-block: 0;
  }
  ::-webkit-datetime-edit-minute-field {
    padding-block: 0;
  }
  ::-webkit-datetime-edit-second-field {
    padding-block: 0;
  }
  ::-webkit-datetime-edit-millisecond-field {
    padding-block: 0;
  }
  ::-webkit-datetime-edit-meridiem-field {
    padding-block: 0;
  }
  ::-webkit-calendar-picker-indicator {
    line-height: 1;
  }
  :-moz-ui-invalid {
    box-shadow: none;
  }
  button,
  input:where([type='button'], [type='reset'], [type='submit']) {
    appearance: button;
  }
  ::file-selector-button {
    appearance: button;
  }
  ::-webkit-inner-spin-button {
    height: auto;
  }
  ::-webkit-outer-spin-button {
    height: auto;
  }
  [hidden]:where(:not([hidden='until-found'])) {
    display: none !important;
  }
}
@layer components;
@layer utilities {
  .pointer-events-none {
    pointer-events: none;
  }
  .visible {
    visibility: visible;
  }
  .absolute {
    position: absolute;
  }
  .fixed {
    position: fixed;
  }
  .relative {
    position: relative;
  }
  .static {
    position: static;
  }
  .sticky {
    position: sticky;
  }
  .inset-0 {
    inset: calc(var(--spacing) * 0);
  }
  .top-0 {
    top: calc(var(--spacing) * 0);
  }
  .top-20 {
    top: calc(var(--spacing) * 20);
  }
  .bottom-0 {
    bottom: calc(var(--spacing) * 0);
  }
  .left-0 {
    left: calc(var(--spacing) * 0);
  }
  .left-20 {
    left: calc(var(--spacing) * 20);
  }
  .-z-10 {
    z-index: calc(10 * -1);
  }
  .col-1 {
    grid-column: 1;
  }
  .col-2 {
    grid-column: 2;
  }
  .row-span-2 {
    grid-row: span 2 / span 2;
  }
  .clear-both {
    clear: both;
  }
  .container {
    width: 100%;
  }
  @media (min-width: 40rem) {
    .container {
      max-width: 40rem;
    }
  }
  @media (min-width: 48rem) {
    .container {
      max-width: 48rem;
    }
  }
  @media (min-width: 64rem) {
    .container {
      max-width: 64rem;
    }
  }
  @media (min-width: 80rem) {
    .container {
      max-width: 80rem;
    }
  }
  @media (min-width: 96rem) {
    .container {
      max-width: 96rem;
    }
  }
  .m-4 {
    margin: calc(var(--spacing) * 4);
  }
  .m-6 {
    margin: calc(var(--spacing) * 6);
  }
  .m-7 {
    margin: calc(var(--spacing) * 7);
  }
  .m-20 {
    margin: calc(var(--spacing) * 20);
  }
  .m-auto {
    margin: auto;
  }
  .mx-1 {
    margin-inline: calc(var(--spacing) * 1);
  }
  .mx-2 {
    margin-inline: calc(var(--spacing) * 2);
  }
  .mx-3 {
    margin-inline: calc(var(--spacing) * 3);
  }
  .mx-4 {
    margin-inline: calc(var(--spacing) * 4);
  }
  .mx-6 {
    margin-inline: calc(var(--spacing) * 6);
  }
  .mx-7 {
    margin-inline: calc(var(--spacing) * 7);
  }
  .mx-10 {
    margin-inline: calc(var(--spacing) * 10);
  }
  .mx-20 {
    margin-inline: calc(var(--spacing) * 20);
  }
  .mx-auto {
    margin-inline: auto;
  }
  .my-2 {
    margin-block: calc(var(--spacing) * 2);
  }
  .my-3 {
    margin-block: calc(var(--spacing) * 3);
  }
  .my-10 {
    margin-block: calc(var(--spacing) * 10);
  }
  .my-12 {
    margin-block: calc(var(--spacing) * 12);
  }
  .mt-2 {
    margin-top: calc(var(--spacing) * 2);
  }
  .mt-3 {
    margin-top: calc(var(--spacing) * 3);
  }
  .mt-4 {
    margin-top: calc(var(--spacing) * 4);
  }
  .mt-6 {
    margin-top: calc(var(--spacing) * 6);
  }
  .mt-7 {
    margin-top: calc(var(--spacing) * 7);
  }
  .mt-10 {
    margin-top: calc(var(--spacing) * 10);
  }
  .mt-12 {
    margin-top: calc(var(--spacing) * 12);
  }
  .mt-20 {
    margin-top: calc(var(--spacing) * 20);
  }
  .mr-2 {
    margin-right: calc(var(--spacing) * 2);
  }
  .mr-8 {
    margin-right: calc(var(--spacing) * 8);
  }
  .mr-px {
    margin-right: 1px;
  }
  .-mb-1 {
    margin-bottom: calc(var(--spacing) * -1);
  }
  .mb-0 {
    margin-bottom: calc(var(--spacing) * 0);
  }
  .mb-0\\.5 {
    margin-bottom: calc(var(--spacing) * 0.5);
  }
  .mb-1 {
    margin-bottom: calc(var(--spacing) * 1);
  }
  .mb-2 {
    margin-bottom: calc(var(--spacing) * 2);
  }
  .mb-3 {
    margin-bottom: calc(var(--spacing) * 3);
  }
  .mb-4 {
    margin-bottom: calc(var(--spacing) * 4);
  }
  .mb-6 {
    margin-bottom: calc(var(--spacing) * 6);
  }
  .mb-8 {
    margin-bottom: calc(var(--spacing) * 8);
  }
  .mb-9 {
    margin-bottom: calc(var(--spacing) * 9);
  }
  .mb-10 {
    margin-bottom: calc(var(--spacing) * 10);
  }
  .mb-20 {
    margin-bottom: calc(var(--spacing) * 20);
  }
  .mb-px {
    margin-bottom: 1px;
  }
  .ml-1 {
    margin-left: calc(var(--spacing) * 1);
  }
  .ml-2 {
    margin-left: calc(var(--spacing) * 2);
  }
  .ml-10 {
    margin-left: calc(var(--spacing) * 10);
  }
  .ml-20 {
    margin-left: calc(var(--spacing) * 20);
  }
  .block {
    display: block;
  }
  .contents {
    display: contents;
  }
  .flex {
    display: flex;
  }
  .grid {
    display: grid;
  }
  .hidden {
    display: none;
  }
  .inline {
    display: inline;
  }
  .inline-block {
    display: inline-block;
  }
  .table {
    display: table;
  }
  .size-5 {
    width: calc(var(--spacing) * 5);
    height: calc(var(--spacing) * 5);
  }
  .size-6 {
    width: calc(var(--spacing) * 6);
    height: calc(var(--spacing) * 6);
  }
  .size-7 {
    width: calc(var(--spacing) * 7);
    height: calc(var(--spacing) * 7);
  }
  .size-8 {
    width: calc(var(--spacing) * 8);
    height: calc(var(--spacing) * 8);
  }
  .h-2 {
    height: calc(var(--spacing) * 2);
  }
  .h-3 {
    height: calc(var(--spacing) * 3);
  }
  .h-5 {
    height: calc(var(--spacing) * 5);
  }
  .h-6 {
    height: calc(var(--spacing) * 6);
  }
  .h-8 {
    height: calc(var(--spacing) * 8);
  }
  .h-10 {
    height: calc(var(--spacing) * 10);
  }
  .h-32 {
    height: calc(var(--spacing) * 32);
  }
  .h-\\[550px\\] {
    height: 550px;
  }
  .h-fit {
    height: fit-content;
  }
  .h-screen {
    height: 100vh;
  }
  .h-svh {
    height: 100svh;
  }
  .min-h-\\[44px\\] {
    min-height: 44px;
  }
  .w-2 {
    width: calc(var(--spacing) * 2);
  }
  .w-4xl {
    width: var(--container-4xl);
  }
  .w-5 {
    width: calc(var(--spacing) * 5);
  }
  .w-5xl {
    width: var(--container-5xl);
  }
  .w-6 {
    width: calc(var(--spacing) * 6);
  }
  .w-8 {
    width: calc(var(--spacing) * 8);
  }
  .w-10 {
    width: calc(var(--spacing) * 10);
  }
  .w-20 {
    width: calc(var(--spacing) * 20);
  }
  .w-\\[333px\\] {
    width: 333px;
  }
  .w-\\[400px\\] {
    width: 400px;
  }
  .w-\\[500px\\] {
    width: 500px;
  }
  .w-\\[700px\\] {
    width: 700px;
  }
  .w-auto {
    width: auto;
  }
  .w-fit {
    width: fit-content;
  }
  .w-full {
    width: 100%;
  }
  .w-md {
    width: var(--container-md);
  }
  .max-w-2xl {
    max-width: var(--container-2xl);
  }
  .max-w-4xl {
    max-width: var(--container-4xl);
  }
  .min-w-4xl {
    min-width: var(--container-4xl);
  }
  .min-w-5xl {
    min-width: var(--container-5xl);
  }
  .flex-1 {
    flex: 1;
  }
  .flex-none {
    flex: none;
  }
  .flex-shrink {
    flex-shrink: 1;
  }
  .shrink-0 {
    flex-shrink: 0;
  }
  .border-collapse {
    border-collapse: collapse;
  }
  .transform {
    transform: var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,)
      var(--tw-skew-y,);
  }
  .cursor-grab {
    cursor: grab;
  }
  .cursor-not-allowed {
    cursor: not-allowed;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .resize {
    resize: both;
  }
  .resize-none {
    resize: none;
  }
  .list-decimal {
    list-style-type: decimal;
  }
  .appearance-none {
    appearance: none;
  }
  .flex-col {
    flex-direction: column;
  }
  .flex-row {
    flex-direction: row;
  }
  .items-baseline {
    align-items: baseline;
  }
  .items-center {
    align-items: center;
  }
  .justify-between {
    justify-content: space-between;
  }
  .justify-center {
    justify-content: center;
  }
  .gap-0 {
    gap: calc(var(--spacing) * 0);
  }
  .gap-1 {
    gap: calc(var(--spacing) * 1);
  }
  .gap-3 {
    gap: calc(var(--spacing) * 3);
  }
  .gap-6 {
    gap: calc(var(--spacing) * 6);
  }
  .gap-10 {
    gap: calc(var(--spacing) * 10);
  }
  .gap-x-2 {
    column-gap: calc(var(--spacing) * 2);
  }
  .gap-x-3 {
    column-gap: calc(var(--spacing) * 3);
  }
  .gap-x-4 {
    column-gap: calc(var(--spacing) * 4);
  }
  .gap-x-20 {
    column-gap: calc(var(--spacing) * 20);
  }
  .gap-y-4 {
    row-gap: calc(var(--spacing) * 4);
  }
  .truncate {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  .overflow-y-auto {
    overflow-y: auto;
  }
  .scroll-smooth {
    scroll-behavior: smooth;
  }
  .rounded {
    border-radius: 0.25rem;
  }
  .rounded-2xl {
    border-radius: var(--radius-2xl);
  }
  .rounded-full {
    border-radius: 3.40282e38px;
  }
  .rounded-lg {
    border-radius: var(--radius-lg);
  }
  .rounded-sm {
    border-radius: var(--radius-sm);
  }
  .rounded-xl {
    border-radius: var(--radius-xl);
  }
  .rounded-xs {
    border-radius: var(--radius-xs);
  }
  .rounded-t {
    border-top-left-radius: 0.25rem;
    border-top-right-radius: 0.25rem;
  }
  .rounded-t-none {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
  .rounded-b {
    border-bottom-right-radius: 0.25rem;
    border-bottom-left-radius: 0.25rem;
  }
  .rounded-b-2xl {
    border-bottom-right-radius: var(--radius-2xl);
    border-bottom-left-radius: var(--radius-2xl);
  }
  .rounded-b-lg {
    border-bottom-right-radius: var(--radius-lg);
    border-bottom-left-radius: var(--radius-lg);
  }
  .rounded-b-none {
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
  }
  .rounded-b-xl {
    border-bottom-right-radius: var(--radius-xl);
    border-bottom-left-radius: var(--radius-xl);
  }
  .rounded-bl-2xl {
    border-bottom-left-radius: var(--radius-2xl);
  }
  .border {
    border-style: var(--tw-border-style);
    border-width: 1px;
  }
  .border-0 {
    border-style: var(--tw-border-style);
    border-width: 0;
  }
  .border-1 {
    border-style: var(--tw-border-style);
    border-width: 1px;
  }
  .border-2 {
    border-style: var(--tw-border-style);
    border-width: 2px;
  }
  .border-4 {
    border-style: var(--tw-border-style);
    border-width: 4px;
  }
  .border-t {
    border-top-style: var(--tw-border-style);
    border-top-width: 1px;
  }
  .border-b-1 {
    border-bottom-style: var(--tw-border-style);
    border-bottom-width: 1px;
  }
  .border-dashed {
    --tw-border-style: dashed;
    border-style: dashed;
  }
  .border-none {
    --tw-border-style: none;
    border-style: none;
  }
  .border-solid {
    --tw-border-style: solid;
    border-style: solid;
  }
  .border-amber-300 {
    border-color: var(--color-amber-300);
  }
  .border-amber-400 {
    border-color: var(--color-amber-400);
  }
  .border-black {
    border-color: var(--color-black);
  }
  .border-blue-500 {
    border-color: var(--color-blue-500);
  }
  .border-gray-200 {
    border-color: var(--color-gray-200);
  }
  .border-gray-300 {
    border-color: var(--color-gray-300);
  }
  .border-gray-400 {
    border-color: var(--color-gray-400);
  }
  .border-gray-500 {
    border-color: var(--color-gray-500);
  }
  .border-gray-600 {
    border-color: var(--color-gray-600);
  }
  .border-gray-700 {
    border-color: var(--color-gray-700);
  }
  .border-gray-800 {
    border-color: var(--color-gray-800);
  }
  .border-gray-900 {
    border-color: var(--color-gray-900);
  }
  .border-neutral-200 {
    border-color: var(--color-neutral-200);
  }
  .border-neutral-300 {
    border-color: var(--color-neutral-300);
  }
  .border-red-500 {
    border-color: var(--color-red-500);
  }
  .border-stone-100 {
    border-color: var(--color-stone-100);
  }
  .border-stone-200 {
    border-color: var(--color-stone-200);
  }
  .border-white {
    border-color: var(--color-white);
  }
  .border-white\\/20 {
    border-color: #fff3;
  }
  @supports (color: color-mix(in lab, red, red)) {
    .border-white\\/20 {
      border-color: color-mix(in oklab, var(--color-white) 20%, transparent);
    }
  }
  .border-white\\/40 {
    border-color: #fff6;
  }
  @supports (color: color-mix(in lab, red, red)) {
    .border-white\\/40 {
      border-color: color-mix(in oklab, var(--color-white) 40%, transparent);
    }
  }
  .border-yellow-500 {
    border-color: var(--color-yellow-500);
  }
  .bg-amber-200 {
    background-color: var(--color-amber-200);
  }
  .bg-black {
    background-color: var(--color-black);
  }
  .bg-blue-50 {
    background-color: var(--color-blue-50);
  }
  .bg-blue-200 {
    background-color: var(--color-blue-200);
  }
  .bg-blue-600 {
    background-color: var(--color-blue-600);
  }
  .bg-gray-50 {
    background-color: var(--color-gray-50);
  }
  .bg-gray-100 {
    background-color: var(--color-gray-100);
  }
  .bg-gray-200 {
    background-color: var(--color-gray-200);
  }
  .bg-gray-300 {
    background-color: var(--color-gray-300);
  }
  .bg-gray-400 {
    background-color: var(--color-gray-400);
  }
  .bg-gray-700 {
    background-color: var(--color-gray-700);
  }
  .bg-gray-800 {
    background-color: var(--color-gray-800);
  }
  .bg-gray-950 {
    background-color: var(--color-gray-950);
  }
  .bg-green-300 {
    background-color: var(--color-green-300);
  }
  .bg-green-400 {
    background-color: var(--color-green-400);
  }
  .bg-green-500 {
    background-color: var(--color-green-500);
  }
  .bg-lime-300 {
    background-color: var(--color-lime-300);
  }
  .bg-neutral-50 {
    background-color: var(--color-neutral-50);
  }
  .bg-neutral-200 {
    background-color: var(--color-neutral-200);
  }
  .bg-neutral-400 {
    background-color: var(--color-neutral-400);
  }
  .bg-neutral-700 {
    background-color: var(--color-neutral-700);
  }
  .bg-neutral-800 {
    background-color: var(--color-neutral-800);
  }
  .bg-neutral-900 {
    background-color: var(--color-neutral-900);
  }
  .bg-orange-400 {
    background-color: var(--color-orange-400);
  }
  .bg-red-100 {
    background-color: var(--color-red-100);
  }
  .bg-red-400 {
    background-color: var(--color-red-400);
  }
  .bg-red-500 {
    background-color: var(--color-red-500);
  }
  .bg-slate-800 {
    background-color: var(--color-slate-800);
  }
  .bg-slate-900 {
    background-color: var(--color-slate-900);
  }
  .bg-stone-50 {
    background-color: var(--color-stone-50);
  }
  .bg-stone-100 {
    background-color: var(--color-stone-100);
  }
  .bg-stone-800 {
    background-color: var(--color-stone-800);
  }
  .bg-teal-200 {
    background-color: var(--color-teal-200);
  }
  .bg-transparent {
    background-color: #0000;
  }
  .bg-white {
    background-color: var(--color-white);
  }
  .bg-yellow-300 {
    background-color: var(--color-yellow-300);
  }
  .bg-zinc-200 {
    background-color: var(--color-zinc-200);
  }
  .bg-linear-to-r {
    --tw-gradient-position: to right;
  }
  @supports (background-image: linear-gradient(in lab, red, red)) {
    .bg-linear-to-r {
      --tw-gradient-position: to right in oklab;
    }
  }
  .bg-linear-to-r {
    background-image: linear-gradient(var(--tw-gradient-stops));
  }
  .from-blue-600 {
    --tw-gradient-from: var(--color-blue-600);
    --tw-gradient-stops: var(
      --tw-gradient-via-stops,
      var(--tw-gradient-position),
      var(--tw-gradient-from) var(--tw-gradient-from-position),
      var(--tw-gradient-to) var(--tw-gradient-to-position)
    );
  }
  .from-blue-700 {
    --tw-gradient-from: var(--color-blue-700);
    --tw-gradient-stops: var(
      --tw-gradient-via-stops,
      var(--tw-gradient-position),
      var(--tw-gradient-from) var(--tw-gradient-from-position),
      var(--tw-gradient-to) var(--tw-gradient-to-position)
    );
  }
  .to-blue-700 {
    --tw-gradient-to: var(--color-blue-700);
    --tw-gradient-stops: var(
      --tw-gradient-via-stops,
      var(--tw-gradient-position),
      var(--tw-gradient-from) var(--tw-gradient-from-position),
      var(--tw-gradient-to) var(--tw-gradient-to-position)
    );
  }
  .to-blue-800 {
    --tw-gradient-to: var(--color-blue-800);
    --tw-gradient-stops: var(
      --tw-gradient-via-stops,
      var(--tw-gradient-position),
      var(--tw-gradient-from) var(--tw-gradient-from-position),
      var(--tw-gradient-to) var(--tw-gradient-to-position)
    );
  }
  .fill-gray-200 {
    fill: var(--color-gray-200);
  }
  .fill-gray-600 {
    fill: var(--color-gray-600);
  }
  .fill-gray-800 {
    fill: var(--color-gray-800);
  }
  .fill-white {
    fill: var(--color-white);
  }
  .stroke-amber-300 {
    stroke: var(--color-amber-300);
  }
  .stroke-gray-200 {
    stroke: var(--color-gray-200);
  }
  .stroke-gray-300 {
    stroke: var(--color-gray-300);
  }
  .stroke-gray-400 {
    stroke: var(--color-gray-400);
  }
  .stroke-gray-600 {
    stroke: var(--color-gray-600);
  }
  .stroke-red-400 {
    stroke: var(--color-red-400);
  }
  .stroke-white {
    stroke: var(--color-white);
  }
  .stroke-yellow-400 {
    stroke: var(--color-yellow-400);
  }
  .stroke-2 {
    stroke-width: 2px;
  }
  .p-1 {
    padding: calc(var(--spacing) * 1);
  }
  .p-2 {
    padding: calc(var(--spacing) * 2);
  }
  .p-3 {
    padding: calc(var(--spacing) * 3);
  }
  .p-4 {
    padding: calc(var(--spacing) * 4);
  }
  .p-5 {
    padding: calc(var(--spacing) * 5);
  }
  .p-6 {
    padding: calc(var(--spacing) * 6);
  }
  .p-9 {
    padding: calc(var(--spacing) * 9);
  }
  .px-1 {
    padding-inline: calc(var(--spacing) * 1);
  }
  .px-2 {
    padding-inline: calc(var(--spacing) * 2);
  }
  .px-3 {
    padding-inline: calc(var(--spacing) * 3);
  }
  .px-4 {
    padding-inline: calc(var(--spacing) * 4);
  }
  .px-6 {
    padding-inline: calc(var(--spacing) * 6);
  }
  .px-\\[2px\\] {
    padding-inline: 2px;
  }
  .py-0 {
    padding-block: calc(var(--spacing) * 0);
  }
  .py-0\\.5 {
    padding-block: calc(var(--spacing) * 0.5);
  }
  .py-1 {
    padding-block: calc(var(--spacing) * 1);
  }
  .py-2 {
    padding-block: calc(var(--spacing) * 2);
  }
  .py-3 {
    padding-block: calc(var(--spacing) * 3);
  }
  .py-px {
    padding-block: 1px;
  }
  .pt-2 {
    padding-top: calc(var(--spacing) * 2);
  }
  .pt-3 {
    padding-top: calc(var(--spacing) * 3);
  }
  .pr-2 {
    padding-right: calc(var(--spacing) * 2);
  }
  .pr-3 {
    padding-right: calc(var(--spacing) * 3);
  }
  .pr-4 {
    padding-right: calc(var(--spacing) * 4);
  }
  .pr-10 {
    padding-right: calc(var(--spacing) * 10);
  }
  .pb-0 {
    padding-bottom: calc(var(--spacing) * 0);
  }
  .pb-2 {
    padding-bottom: calc(var(--spacing) * 2);
  }
  .pb-4 {
    padding-bottom: calc(var(--spacing) * 4);
  }
  .pb-6 {
    padding-bottom: calc(var(--spacing) * 6);
  }
  .pb-10 {
    padding-bottom: calc(var(--spacing) * 10);
  }
  .pb-40 {
    padding-bottom: calc(var(--spacing) * 40);
  }
  .pl-3 {
    padding-left: calc(var(--spacing) * 3);
  }
  .pl-4 {
    padding-left: calc(var(--spacing) * 4);
  }
  .pl-6 {
    padding-left: calc(var(--spacing) * 6);
  }
  .text-center {
    text-align: center;
  }
  .text-left {
    text-align: left;
  }
  .text-right {
    text-align: right;
  }
  .font-mono {
    font-family: var(--font-mono);
  }
  .font-sans {
    font-family: var(--font-sans);
  }
  .font-serif {
    font-family: var(--font-serif);
  }
  .text-2xl {
    font-size: var(--text-2xl);
    line-height: var(--tw-leading, var(--text-2xl--line-height));
  }
  .text-2xl\\/tight {
    font-size: var(--text-2xl);
    line-height: var(--leading-tight);
  }
  .text-3xl {
    font-size: var(--text-3xl);
    line-height: var(--tw-leading, var(--text-3xl--line-height));
  }
  .text-3xl\\/tight {
    font-size: var(--text-3xl);
    line-height: var(--leading-tight);
  }
  .text-4xl {
    font-size: var(--text-4xl);
    line-height: var(--tw-leading, var(--text-4xl--line-height));
  }
  .text-5xl {
    font-size: var(--text-5xl);
    line-height: var(--tw-leading, var(--text-5xl--line-height));
  }
  .text-5xl\\/tight {
    font-size: var(--text-5xl);
    line-height: var(--leading-tight);
  }
  .text-6xl {
    font-size: var(--text-6xl);
    line-height: var(--tw-leading, var(--text-6xl--line-height));
  }
  .text-7xl {
    font-size: var(--text-7xl);
    line-height: var(--tw-leading, var(--text-7xl--line-height));
  }
  .text-base {
    font-size: var(--text-base);
    line-height: var(--tw-leading, var(--text-base--line-height));
  }
  .text-base\\/snug {
    font-size: var(--text-base);
    line-height: var(--leading-snug);
  }
  .text-lg {
    font-size: var(--text-lg);
    line-height: var(--tw-leading, var(--text-lg--line-height));
  }
  .text-sm {
    font-size: var(--text-sm);
    line-height: var(--tw-leading, var(--text-sm--line-height));
  }
  .text-sm\\/snug {
    font-size: var(--text-sm);
    line-height: var(--leading-snug);
  }
  .text-xl {
    font-size: var(--text-xl);
    line-height: var(--tw-leading, var(--text-xl--line-height));
  }
  .text-xs {
    font-size: var(--text-xs);
    line-height: var(--tw-leading, var(--text-xs--line-height));
  }
  .text-xs\\/snug {
    font-size: var(--text-xs);
    line-height: var(--leading-snug);
  }
  .text-\\[9px\\] {
    font-size: 9px;
  }
  .text-\\[10px\\] {
    font-size: 10px;
  }
  .text-\\[11px\\] {
    font-size: 11px;
  }
  .text-\\[12px\\] {
    font-size: 12px;
  }
  .text-\\[15px\\] {
    font-size: 15px;
  }
  .font-black {
    --tw-font-weight: var(--font-weight-black);
    font-weight: var(--font-weight-black);
  }
  .font-bold {
    --tw-font-weight: var(--font-weight-bold);
    font-weight: var(--font-weight-bold);
  }
  .font-extrabold {
    --tw-font-weight: var(--font-weight-extrabold);
    font-weight: var(--font-weight-extrabold);
  }
  .font-extralight {
    --tw-font-weight: var(--font-weight-extralight);
    font-weight: var(--font-weight-extralight);
  }
  .font-light {
    --tw-font-weight: var(--font-weight-light);
    font-weight: var(--font-weight-light);
  }
  .font-medium {
    --tw-font-weight: var(--font-weight-medium);
    font-weight: var(--font-weight-medium);
  }
  .font-semibold {
    --tw-font-weight: var(--font-weight-semibold);
    font-weight: var(--font-weight-semibold);
  }
  .tracking-\\[-0\\.1px\\] {
    --tw-tracking: -0.1px;
    letter-spacing: -0.1px;
  }
  .tracking-wide {
    --tw-tracking: var(--tracking-wide);
    letter-spacing: var(--tracking-wide);
  }
  .text-pretty {
    text-wrap: pretty;
  }
  .text-wrap {
    text-wrap: wrap;
  }
  .whitespace-normal {
    white-space: normal;
  }
  .text-black {
    color: var(--color-black);
  }
  .text-blue-600 {
    color: var(--color-blue-600);
  }
  .text-blue-700 {
    color: var(--color-blue-700);
  }
  .text-gray-400 {
    color: var(--color-gray-400);
  }
  .text-gray-500 {
    color: var(--color-gray-500);
  }
  .text-gray-700 {
    color: var(--color-gray-700);
  }
  .text-gray-800 {
    color: var(--color-gray-800);
  }
  .text-green-300 {
    color: var(--color-green-300);
  }
  .text-green-900 {
    color: var(--color-green-900);
  }
  .text-neutral-50 {
    color: var(--color-neutral-50);
  }
  .text-neutral-400 {
    color: var(--color-neutral-400);
  }
  .text-neutral-500 {
    color: var(--color-neutral-500);
  }
  .text-neutral-900 {
    color: var(--color-neutral-900);
  }
  .text-neutral-950 {
    color: var(--color-neutral-950);
  }
  .text-red-500 {
    color: var(--color-red-500);
  }
  .text-red-600 {
    color: var(--color-red-600);
  }
  .text-stone-900 {
    color: var(--color-stone-900);
  }
  .text-white {
    color: var(--color-white);
  }
  .text-yellow-400 {
    color: var(--color-yellow-400);
  }
  .text-yellow-600 {
    color: var(--color-yellow-600);
  }
  .text-zinc-950 {
    color: var(--color-zinc-950);
  }
  .lowercase {
    text-transform: lowercase;
  }
  .uppercase {
    text-transform: uppercase;
  }
  .ordinal {
    --tw-ordinal: ordinal;
    font-variant-numeric: var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,)
      var(--tw-numeric-spacing,) var(--tw-numeric-fraction,);
  }
  .tabular-nums {
    --tw-numeric-spacing: tabular-nums;
    font-variant-numeric: var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,)
      var(--tw-numeric-spacing,) var(--tw-numeric-fraction,);
  }
  .underline {
    text-decoration-line: underline;
  }
  .decoration-1 {
    text-decoration-thickness: 1px;
  }
  .decoration-2 {
    text-decoration-thickness: 2px;
  }
  .underline-offset-2 {
    text-underline-offset: 2px;
  }
  .underline-offset-3 {
    text-underline-offset: 3px;
  }
  .underline-offset-4 {
    text-underline-offset: 4px;
  }
  .antialiased {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .caret-blue-600 {
    caret-color: var(--color-blue-600);
  }
  .caret-pink-500 {
    caret-color: var(--color-pink-500);
  }
  .shadow {
    --tw-shadow:
      0 1px 3px 0 var(--tw-shadow-color, #0000001a),
      0 1px 2px -1px var(--tw-shadow-color, #0000001a);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-\\[0_0_15px_15px_rgba\\(255\\,255\\,255\\,1\\)\\] {
    --tw-shadow: 0 0 15px 15px var(--tw-shadow-color, #fff);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-\\[0_0_40px_40px_rgba\\(255\\,255\\,255\\,1\\)\\] {
    --tw-shadow: 0 0 40px 40px var(--tw-shadow-color, #fff);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-\\[0_0_60px_rgba\\(0\\,0\\,0\\,0\\.6\\)\\] {
    --tw-shadow: 0 0 60px var(--tw-shadow-color, #0009);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-\\[0px_0px_3px_rgba\\(0\\,0\\,0\\,0\\.4\\)\\] {
    --tw-shadow: 0px 0px 3px var(--tw-shadow-color, #0006);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-lg {
    --tw-shadow:
      0 10px 15px -3px var(--tw-shadow-color, #0000001a),
      0 4px 6px -4px var(--tw-shadow-color, #0000001a);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-sm {
    --tw-shadow:
      0 1px 3px 0 var(--tw-shadow-color, #0000001a),
      0 1px 2px -1px var(--tw-shadow-color, #0000001a);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .inset-shadow-sm {
    --tw-inset-shadow: inset 0 2px 4px var(--tw-inset-shadow-color, #0000000d);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .inset-shadow-indigo-500 {
    --tw-inset-shadow-color: oklch(58.5% 0.233 277.117);
  }
  @supports (color: color-mix(in lab, red, red)) {
    .inset-shadow-indigo-500 {
      --tw-inset-shadow-color: color-mix(
        in oklab,
        var(--color-indigo-500) var(--tw-inset-shadow-alpha),
        transparent
      );
    }
  }
  .outline {
    outline-style: var(--tw-outline-style);
    outline-width: 1px;
  }
  .outline-0 {
    outline-style: var(--tw-outline-style);
    outline-width: 0;
  }
  .blur {
    --tw-blur: blur(8px);
    filter: var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,)
      var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,)
      var(--tw-drop-shadow,);
  }
  .filter {
    filter: var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,)
      var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,)
      var(--tw-drop-shadow,);
  }
  .transition {
    transition-property:
      color,
      background-color,
      border-color,
      outline-color,
      text-decoration-color,
      fill,
      stroke,
      --tw-gradient-from,
      --tw-gradient-via,
      --tw-gradient-to,
      opacity,
      box-shadow,
      transform,
      translate,
      scale,
      rotate,
      filter,
      -webkit-backdrop-filter,
      backdrop-filter,
      display,
      content-visibility,
      overlay,
      pointer-events;
    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
    transition-duration: var(--tw-duration, var(--default-transition-duration));
  }
  .transition-all {
    transition-property: all;
    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
    transition-duration: var(--tw-duration, var(--default-transition-duration));
  }
  .duration-300 {
    --tw-duration: 0.3s;
    transition-duration: 0.3s;
  }
  .ease-in-out {
    --tw-ease: var(--ease-in-out);
    transition-timing-function: var(--ease-in-out);
  }
  .ease-out {
    --tw-ease: var(--ease-out);
    transition-timing-function: var(--ease-out);
  }
  .outline-none {
    --tw-outline-style: none;
    outline-style: none;
  }
  .group-disabled\\:fill-gray-200:is(:where(.group):disabled *) {
    fill: var(--color-gray-200);
  }
  .peer-checked\\/s0\\:rounded-full:is(:where(.peer\\/s0):checked ~ *) {
    border-radius: 3.40282e38px;
  }
  .peer-checked\\/s0\\:ring-3:is(:where(.peer\\/s0):checked ~ *) {
    --tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(3px + var(--tw-ring-offset-width))
      var(--tw-ring-color, currentcolor);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .peer-checked\\/s1\\:rounded-full:is(:where(.peer\\/s1):checked ~ *) {
    border-radius: 3.40282e38px;
  }
  .peer-checked\\/s1\\:ring-3:is(:where(.peer\\/s1):checked ~ *) {
    --tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(3px + var(--tw-ring-offset-width))
      var(--tw-ring-color, currentcolor);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .peer-checked\\/s2\\:rounded-full:is(:where(.peer\\/s2):checked ~ *) {
    border-radius: 3.40282e38px;
  }
  .peer-checked\\/s2\\:ring-3:is(:where(.peer\\/s2):checked ~ *) {
    --tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(3px + var(--tw-ring-offset-width))
      var(--tw-ring-color, currentcolor);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .peer-checked\\/s3\\:rounded-full:is(:where(.peer\\/s3):checked ~ *) {
    border-radius: 3.40282e38px;
  }
  .peer-checked\\/s3\\:ring-3:is(:where(.peer\\/s3):checked ~ *) {
    --tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(3px + var(--tw-ring-offset-width))
      var(--tw-ring-color, currentcolor);
    box-shadow:
      var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow),
      var(--tw-ring-shadow), var(--tw-shadow);
  }
  .placeholder\\:font-sans::placeholder {
    font-family: var(--font-sans);
  }
  .placeholder\\:text-gray-400::placeholder {
    color: var(--color-gray-400);
  }
  .before\\:absolute:before {
    content: var(--tw-content);
    position: absolute;
  }
  .before\\:left-0:before {
    content: var(--tw-content);
    left: calc(var(--spacing) * 0);
  }
  .before\\:content-\\[\\'–\\'\\]:before {
    --tw-content: '–';
    content: var(--tw-content);
  }
  .odd\\:float-right:nth-child(odd) {
    float: right;
  }
  .odd\\:my-8:nth-child(odd) {
    margin-block: calc(var(--spacing) * 8);
  }
  .odd\\:max-w-lg:nth-child(odd) {
    max-width: var(--container-lg);
  }
  .odd\\:rounded-xl:nth-child(odd) {
    border-radius: var(--radius-xl);
  }
  .odd\\:bg-gray-100:nth-child(odd) {
    background-color: var(--color-gray-100);
  }
  .odd\\:px-5:nth-child(odd) {
    padding-inline: calc(var(--spacing) * 5);
  }
  .odd\\:py-2:nth-child(odd) {
    padding-block: calc(var(--spacing) * 2);
  }
  .odd\\:font-serif:nth-child(odd) {
    font-family: var(--font-serif);
  }
  .odd\\:text-base:nth-child(odd) {
    font-size: var(--text-base);
    line-height: var(--tw-leading, var(--text-base--line-height));
  }
  .even\\:clear-both:nth-child(2n) {
    clear: both;
  }
  @media (hover: hover) {
    .hover\\:rounded-lg:hover {
      border-radius: var(--radius-lg);
    }
    .hover\\:bg-gray-50:hover {
      background-color: var(--color-gray-50);
    }
    .hover\\:bg-gray-100:hover {
      background-color: var(--color-gray-100);
    }
    .hover\\:stroke-blue-600:hover {
      stroke: var(--color-blue-600);
    }
    .hover\\:stroke-red-700:hover {
      stroke: var(--color-red-700);
    }
    .hover\\:underline:hover {
      text-decoration-line: underline;
    }
    .hover\\:underline-offset-4:hover {
      text-underline-offset: 4px;
    }
  }
  .focus\\:outline-none:focus {
    --tw-outline-style: none;
    outline-style: none;
  }
  .disabled\\:cursor-progress:disabled {
    cursor: progress;
  }
  .disabled\\:border-stone-200:disabled {
    border-color: var(--color-stone-200);
  }
  .disabled\\:text-gray-400:disabled {
    color: var(--color-gray-400);
  }
  .disabled\\:text-gray-500:disabled {
    color: var(--color-gray-500);
  }
  @media (hover: hover) {
    .disabled\\:hover\\:bg-white:disabled:hover {
      background-color: var(--color-white);
    }
  }
  .data-\\[active\\]\\:border-gray-400[data-active] {
    border-color: var(--color-gray-400);
  }
  .data-\\[active\\]\\:bg-gray-100[data-active] {
    background-color: var(--color-gray-100);
  }
  .data-\\[score\\=\\'-1\\'\\]\\:bg-red-500[data-score='-1'],
  .data-\\[score\\=\\'0\\'\\]\\:bg-red-500[data-score='0'] {
    background-color: var(--color-red-500);
  }
  .data-\\[score\\=\\'1\\'\\]\\:bg-orange-400[data-score='1'] {
    background-color: var(--color-orange-400);
  }
  .data-\\[score\\=\\'2\\'\\]\\:bg-lime-300[data-score='2'] {
    background-color: var(--color-lime-300);
  }
  .data-\\[score\\=\\'3\\'\\]\\:bg-green-500[data-score='3'] {
    background-color: var(--color-green-500);
  }
}
@keyframes entrance {
  0% {
    opacity: 0;
    transform: scale3d(0, 0, 0);
  }
  10% {
    opacity: 1;
    transform: scale(1);
  }
  30% {
    transform: scale(1.25, 0.75);
  }
  40% {
    transform: scale(0.75, 1.25);
  }
  50% {
    transform: scale(1.15, 0.85);
  }
  65% {
    transform: scale(0.95, 1.05);
  }
  75% {
    transform: scale(1.05, 0.95);
  }
  to {
    transform: scale(1);
  }
}
@keyframes exit {
  0% {
    transform: scale(1);
  }
  10% {
    transform: scale(1.05, 0.95);
  }
  30% {
    transform: scale(0.95, 1.05);
  }
  40% {
    transform: scale(1.15, 0.85);
  }
  50% {
    transform: scale(0.75, 1.25);
  }
  65% {
    transform: scale(1.25, 0.75);
  }
  75% {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale3d(0, 0, 0);
  }
}
@property --tw-rotate-x {
  syntax: '*';
  inherits: false;
}
@property --tw-rotate-y {
  syntax: '*';
  inherits: false;
}
@property --tw-rotate-z {
  syntax: '*';
  inherits: false;
}
@property --tw-skew-x {
  syntax: '*';
  inherits: false;
}
@property --tw-skew-y {
  syntax: '*';
  inherits: false;
}
@property --tw-border-style {
  syntax: '*';
  inherits: false;
  initial-value: solid;
}
@property --tw-gradient-position {
  syntax: '*';
  inherits: false;
}
@property --tw-gradient-from {
  syntax: '<color>';
  inherits: false;
  initial-value: #0000;
}
@property --tw-gradient-via {
  syntax: '<color>';
  inherits: false;
  initial-value: #0000;
}
@property --tw-gradient-to {
  syntax: '<color>';
  inherits: false;
  initial-value: #0000;
}
@property --tw-gradient-stops {
  syntax: '*';
  inherits: false;
}
@property --tw-gradient-via-stops {
  syntax: '*';
  inherits: false;
}
@property --tw-gradient-from-position {
  syntax: '<length-percentage>';
  inherits: false;
  initial-value: 0%;
}
@property --tw-gradient-via-position {
  syntax: '<length-percentage>';
  inherits: false;
  initial-value: 50%;
}
@property --tw-gradient-to-position {
  syntax: '<length-percentage>';
  inherits: false;
  initial-value: 100%;
}
@property --tw-font-weight {
  syntax: '*';
  inherits: false;
}
@property --tw-tracking {
  syntax: '*';
  inherits: false;
}
@property --tw-ordinal {
  syntax: '*';
  inherits: false;
}
@property --tw-slashed-zero {
  syntax: '*';
  inherits: false;
}
@property --tw-numeric-figure {
  syntax: '*';
  inherits: false;
}
@property --tw-numeric-spacing {
  syntax: '*';
  inherits: false;
}
@property --tw-numeric-fraction {
  syntax: '*';
  inherits: false;
}
@property --tw-shadow {
  syntax: '*';
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-shadow-color {
  syntax: '*';
  inherits: false;
}
@property --tw-shadow-alpha {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}
@property --tw-inset-shadow {
  syntax: '*';
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-inset-shadow-color {
  syntax: '*';
  inherits: false;
}
@property --tw-inset-shadow-alpha {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}
@property --tw-ring-color {
  syntax: '*';
  inherits: false;
}
@property --tw-ring-shadow {
  syntax: '*';
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-inset-ring-color {
  syntax: '*';
  inherits: false;
}
@property --tw-inset-ring-shadow {
  syntax: '*';
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-ring-inset {
  syntax: '*';
  inherits: false;
}
@property --tw-ring-offset-width {
  syntax: '<length>';
  inherits: false;
  initial-value: 0;
}
@property --tw-ring-offset-color {
  syntax: '*';
  inherits: false;
  initial-value: #fff;
}
@property --tw-ring-offset-shadow {
  syntax: '*';
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-outline-style {
  syntax: '*';
  inherits: false;
  initial-value: solid;
}
@property --tw-blur {
  syntax: '*';
  inherits: false;
}
@property --tw-brightness {
  syntax: '*';
  inherits: false;
}
@property --tw-contrast {
  syntax: '*';
  inherits: false;
}
@property --tw-grayscale {
  syntax: '*';
  inherits: false;
}
@property --tw-hue-rotate {
  syntax: '*';
  inherits: false;
}
@property --tw-invert {
  syntax: '*';
  inherits: false;
}
@property --tw-opacity {
  syntax: '*';
  inherits: false;
}
@property --tw-saturate {
  syntax: '*';
  inherits: false;
}
@property --tw-sepia {
  syntax: '*';
  inherits: false;
}
@property --tw-drop-shadow {
  syntax: '*';
  inherits: false;
}
@property --tw-drop-shadow-color {
  syntax: '*';
  inherits: false;
}
@property --tw-drop-shadow-alpha {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}
@property --tw-drop-shadow-size {
  syntax: '*';
  inherits: false;
}
@property --tw-duration {
  syntax: '*';
  inherits: false;
}
@property --tw-ease {
  syntax: '*';
  inherits: false;
}
@property --tw-content {
  syntax: '*';
  inherits: false;
  initial-value: '';
}
`;var Zv=N0(q5(),1),$q=N0(Y$(),1),qq=N0(Gq(),1);var rx=N0(q5(),1),Gv=N0(v2(),1),Zq=({onFilesUpdated:Q})=>{let $=rx.useRef(null),[M,A]=rx.useState([]),[b,d]=rx.useState(!1),_=async(E)=>{let X0=E.target.files?Array.from(E.target.files):[];await O(X0),E.target.value=""},O=async(E)=>{A((Q0)=>[...Q0,...E]);let X0=[];for(let Q0 of E)if(Q0.type==="application/pdf")try{X0.push({file:Q0,text:"test"})}catch(K0){console.error(`Failed to parse ${Q0.name}:`,K0)}if(Q)Q([...M,...E],X0)},m=(E)=>{let X0=M.filter((Q0,K0)=>K0!==E);if(A(X0),Q)Q(X0,[])};return Gv.jsxDEV("div",{className:`mb-4 cursor-pointer rounded border border-dashed border-white/40 p-3 text-center font-sans text-xs transition-all duration-300 ease-out ${b?"border-blue-500 bg-blue-50":"border-white/20 bg-transparent"} `,onClick:()=>$.current?.click(),onDragOver:(E)=>{E.preventDefault(),d(!0)},onDragLeave:()=>d(!1),onDrop:async(E)=>{if(E.preventDefault(),d(!1),E.dataTransfer.files)await O(Array.from(E.dataTransfer.files))},children:[Gv.jsxDEV("p",{children:"Ajouter des fichiers (PDF uniquement)"},void 0,!1,void 0,this),Gv.jsxDEV("input",{ref:$,type:"file",multiple:!0,accept:"application/pdf",className:"hidden",onChange:_},void 0,!1,void 0,this),M.length>0&&Gv.jsxDEV("ul",{className:"mt-2 px-2",children:M.map((E,X0)=>Gv.jsxDEV("li",{className:"-mb-1 flex items-center justify-between gap-x-3",children:[Gv.jsxDEV("span",{className:"truncate text-xs",children:E.name},void 0,!1,void 0,this),Gv.jsxDEV("button",{className:"cursor-pointer",onClick:()=>m(X0),children:"✕"},void 0,!1,void 0,this)]},X0,!0,void 0,this))},void 0,!1,void 0,this)]},void 0,!0,void 0,this)};var J1=N0(v2(),1);function Bq(Q){return J1.jsxDEV(J1.Fragment,{children:J1.jsxDEV("div",{className:"p-9 pt-2",children:[J1.jsxDEV("p",{className:"text-3xl font-medium",children:"Générer une réponse"},void 0,!1,void 0,this),J1.jsxDEV("p",{className:"mb-4 text-xs/snug text-pretty text-gray-400",children:"Cette action génère une réponse et la complète directement dans le champ dédié Aravis."},void 0,!1,void 0,this),J1.jsxDEV("p",{className:"mb-4 text-base/snug font-extralight text-pretty",children:"Contexte + PDF (optionnel)"},void 0,!1,void 0,this),J1.jsxDEV("textarea",{id:"textarea",className:"mb-1 h-32 w-full resize-none rounded border border-solid border-white/40 p-4 text-sm caret-pink-500 outline-none"},void 0,!1,void 0,this),J1.jsxDEV(Zq,{},void 0,!1,void 0,this),J1.jsxDEV("button",{className:"mb-3 block w-full rounded bg-white p-2 text-lg font-bold text-zinc-950",children:"Générer"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)},void 0,!1,void 0,this)}var RG=N0(v2(),1);function Xq({isUpdateNeeded:Q}){if(Q===void 0)return RG.jsxDEV("p",{className:"block w-full rounded-t-none rounded-b-lg border-2 border-black bg-yellow-300 py-0.5 text-center text-[10px] text-neutral-900",children:"Impossible de vérifier les mises à jour."},void 0,!1,void 0,this);if(!Q)return null;return RG.jsxDEV("a",{href:"http://charnould.github.io/pierre/bridge.html",className:"block w-full rounded-t-none rounded-b-lg border-2 border-black bg-green-300 py-0.5 text-center text-[10px] text-neutral-900",children:"Une nouvelle version est disponible."},void 0,!1,void 0,this)}var r2=N0(v2(),1);function Hq(Q){return r2.jsxDEV(r2.Fragment,{children:r2.jsxDEV("div",{className:"mx-6 pb-4",children:[r2.jsxDEV("p",{className:"mb-2 text-5xl/tight font-semibold",children:"(ó﹏ò｡)"},void 0,!1,void 0,this),r2.jsxDEV("p",{className:"mb-2 text-2xl/tight font-medium",children:"Hmmm… je ne peux pas interagir avec cette page."},void 0,!1,void 0,this),r2.jsxDEV("p",{className:"mb-0.5 text-sm font-light",children:"Pour le moment, mes capacités n’opèrent que sur des pages définies d’ACG/Aravis™."},void 0,!1,void 0,this),r2.jsxDEV("p",{className:"mb-2 text-sm font-light",children:"Rendez-vous sur une page compatible !"},void 0,!1,void 0,this),r2.jsxDEV("p",{className:"mb-2 text-sm font-light text-gray-500",children:["Des idées pour de nouvelles interactions ? ",r2.jsxDEV("br",{},void 0,!1,void 0,this),"Un email à"," ",r2.jsxDEV("a",{href:"/",className:"underline underline-offset-3",children:"charnould@pierre-ia.org"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)},void 0,!1,void 0,this)}var VG=N0(q5(),1);var n2=N0(v2(),1);function Jq(Q){let $=()=>{let _=document.querySelector("pierre-extension");if(!_)return;_.style.animation="exit 1s ease-out forwards",_.addEventListener("animationend",()=>_.remove(),{once:!0})},{settings:M,setSettings:A,detectedView:b,setDetectedView:d}=Q;return console.log("????icic: ",b),n2.jsxDEV("div",{className:"flex cursor-pointer items-center justify-between px-3 pt-3 pb-0",children:[M.isSet&&b==="aie"&&n2.jsxDEV(n2.Fragment,{children:[n2.jsxDEV("div",{onClick:()=>d("settings"),className:"flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black",children:"⁞"},void 0,!1,void 0,this),n2.jsxDEV("div",{onClick:$,className:"flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black",children:"✕"},void 0,!1,void 0,this)]},void 0,!0,void 0,this),M.isSet&&b==="settings"&&n2.jsxDEV(n2.Fragment,{children:[n2.jsxDEV("svg",{onClick:()=>d("aie"),xmlns:"http://www.w3.org/2000/svg",className:"size-6 stroke-yellow-400",viewBox:"0 0 24 24",children:n2.jsxDEV("path",{d:"m12 16l1.4-1.4l-1.6-1.6H16v-2h-4.2l1.6-1.6L12 8l-4 4zm0 6q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"},void 0,!1,void 0,this)},void 0,!1,void 0,this),n2.jsxDEV("div",{onClick:$,className:"flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black",children:"✕"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}var Q1=N0(v2(),1),EY=window.chrome;function Qq(Q){let{settings:$,setSettings:M,detectedView:A,setDetectedView:b}=Q,[d,_]=VG.useState($.apiUrl??""),[O,m]=VG.useState($.apiToken??""),r=async()=>{let P=d.trim().toUpperCase(),j=O.trim().toUpperCase();if(P&&j)await EY.storage.local.set({apiUrl:P,apiToken:j,isSet:!0}),M({apiUrl:P,apiToken:j,isSet:!0}),b("task")};return Q1.jsxDEV(Q1.Fragment,{children:[Q1.jsxDEV(Jq,{...Q},void 0,!1,void 0,this),Q1.jsxDEV("div",{className:"mx-6 pb-6",children:[Q1.jsxDEV("p",{className:"text-3xl/tight font-semibold",children:"Paramètres"},void 0,!1,void 0,this),Q1.jsxDEV("p",{className:"mb-4 text-2xl/tight font-medium",children:"Paramétrons l'extension. C'est à faire une seule fois."},void 0,!1,void 0,this),Q1.jsxDEV("input",{autoFocus:!0,className:"mt-2 block w-full rounded border border-gray-500 p-3 text-base font-medium text-white caret-blue-600 placeholder:text-gray-400 focus:outline-none",type:"text",id:"apiUrl",placeholder:"https://gdh.pierre-ia.org/api",value:d,onChange:(P)=>_(P.target.value)},void 0,!1,void 0,this),Q1.jsxDEV("input",{className:"mt-2 block w-full rounded border border-gray-500 p-3 text-base font-medium text-white caret-blue-600 placeholder:text-gray-400 focus:outline-none",type:"text",id:"apiToken",placeholder:"f390kSKZO0Z?d35dkz",value:O,onChange:(P)=>m(P.target.value)},void 0,!1,void 0,this),Q1.jsxDEV("button",{className:"pointer-cursor mt-2 mb-4 block w-full rounded bg-neutral-50 p-3 text-center text-lg font-bold text-neutral-900",id:"saveButton",onClick:r,children:"Paramétrer l'extension"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)]},void 0,!0,void 0,this)}var g2=N0(v2(),1),NY=window.chrome;async function SY(){try{let A=function(){let d=Zv.useRef(null),[_,O]=Zv.useState(void 0),[m,r]=Zv.useState({apiUrl:"",apiToken:"",isSet:!1}),[P,j]=Zv.useState("aie");Zv.useEffect(()=>{NY.storage.local.get(["apiUrl","apiToken","isSet"]).then((Q0)=>{r((K0)=>({...K0,apiUrl:Q0.apiUrl??K0.apiUrl,apiToken:Q0.apiToken??K0.apiToken,isSet:Q0.isSet??K0.isSet})),console.log("SETTINGS:",Q0)}).catch(()=>console.error("Failed to fetch settings from Chrome storage.")),fetch("https://raw.githubusercontent.com/charnould/pierre/master/bridge/extension/version").then((Q0)=>Q0.ok?Q0.text():Promise.reject()).then((Q0)=>{let K0=JSON.parse(Q0);O(K0>"2025-11-30T09:56:08.535Z")}).catch(()=>{O(void 0)})},[]);let E=()=>{let Q0=document.querySelector("pierre-extension");if(!Q0)return;Q0.style.animation="exit 1s ease-out forwards",Q0.addEventListener("animationend",()=>Q0.remove(),{once:!0})},X0=()=>{if(document.querySelector("#bridgepierre"))return console.log("je pexu lancer la task"),!0;else return console.log("je peux pas lancer la task"),!1};return g2.jsxDEV(qq.default,{nodeRef:d,children:g2.jsxDEV("div",{ref:d,children:g2.jsxDEV("div",{className:"w-[333px] rounded-2xl font-sans text-white tabular-nums shadow-[0_0_60px_rgba(0,0,0,0.6)]",style:{animation:"entrance 1s ease-out forwards",backgroundImage:"linear-gradient(133.84deg, #4E4E4E -16.04%, #333333 9.33%, #1A1A1A 32.02%, #1A1A1A 62.06%, #262626 87.42%, #4E4E4E 112.12%)"},children:[g2.jsxDEV("div",{className:"flex cursor-pointer items-center justify-between px-3 pt-3 pb-0",children:m.isSet&&P==="aie"&&g2.jsxDEV(g2.Fragment,{children:[g2.jsxDEV("div",{onClick:()=>j("settings"),className:"flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black",children:"⁞"},void 0,!1,void 0,this),g2.jsxDEV("div",{onClick:E,className:"flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black",children:"✕"},void 0,!1,void 0,this)]},void 0,!0,void 0,this)},void 0,!1,void 0,this),P!=="settings"&&m.isSet&&X0()?g2.jsxDEV(Bq,{settings:m,setSettings:r,detectedView:P,setDetectedView:j},void 0,!1,void 0,this):g2.jsxDEV(Hq,{settings:m,setSettings:r,detectedView:P,setDetectedView:j},void 0,!1,void 0,this),(!m.isSet||m.isSet&&P==="settings")&&g2.jsxDEV(Qq,{settings:m,setSettings:r,detectedView:P,setDetectedView:j},void 0,!1,void 0,this),g2.jsxDEV(Xq,{isUpdateNeeded:_},void 0,!1,void 0,this)]},void 0,!0,void 0,this)},void 0,!1,void 0,this)},void 0,!1,void 0,this)},Q=document.createElement("pierre-extension");Object.assign(Q.style,{position:"absolute",zIndex:"9999",left:"50px",top:"50px"});let $=Q.attachShadow({mode:"open"});$.innerHTML=`<style>${$$}</style><div></div>`;let M=$.querySelector("div");$q.default.createRoot(M).render(g2.jsxDEV(A,{},void 0,!1,void 0,this)),document.body.appendChild(Q)}catch(Q){console.error(Q)}}SY();
