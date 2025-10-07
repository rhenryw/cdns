;(function(){
  var processedAttributeName = 'data-cdn-processed'
  var cacheKeySeparator = '::'
  var repoCommitCache = new Map()

  function parseCdnSpec(spec){
    if(!spec||typeof spec!=='string')return null
    var parts=spec.trim().split(/\s+/)
    if(parts.length===0)return null
    var repoPath=parts[0]
    var userRepoPath=repoPath.split('/')
    if(userRepoPath.length<3)return null
    var user=userRepoPath[0]
    var repo=userRepoPath[1]
    var path=userRepoPath.slice(2).join('/')
    var params={}
    for(var i=1;i<parts.length;i++){
      var kv=parts[i].split('=')
      if(kv.length===2){
        params[kv[0]] = kv[1]
      }
    }
    if(path.indexOf('blob/')===0){
      var blobSeg=path.split('/')
      if(blobSeg.length>=3){
        if(!params.ref)params.ref=blobSeg[1]
        path=blobSeg.slice(2).join('/')
      }
    }
    return {user:user,repo:repo,path:path,params:params}
  }

  function buildUrl(user,repo,commitOrRef,path,lg){
    if(lg==='1'){
      return 'https://cdn.statically.io/gh/'+encodeURIComponent(user)+'/'+encodeURIComponent(repo)+'/'+encodeURIComponent(commitOrRef)+'/'+path.replace(/^\//,'')
    }else{
      return 'https://cdn.jsdelivr.net/gh/'+encodeURIComponent(user)+'/'+encodeURIComponent(repo)+'@'+encodeURIComponent(commitOrRef)+'/'+path.replace(/^\//,'')
    }
  }

  function selectTargetAttribute(element){
    var tag=element.tagName.toLowerCase()
    if(tag==='link')return 'href'
    if('src' in element)return 'src'
    if('href' in element)return 'href'
    return null
  }

  function resolveCommitHash(user,repo,params){
    if(params&&params.sha)return Promise.resolve(params.sha)
    var ref=null
    if(params&&params.ref)ref=params.ref
    var cacheKey=user+'/'+repo+cacheKeySeparator+(ref||'latest')
    if(repoCommitCache.has(cacheKey))return repoCommitCache.get(cacheKey)
    var promise
    if(ref){
      var url='https://api.github.com/repos/'+encodeURIComponent(user)+'/'+encodeURIComponent(repo)+'/commits/'+encodeURIComponent(ref)
      promise=fetch(url,{headers:{'Accept':'application/vnd.github+json','X-Requested-With':'cdns','User-Agent':'cdns-loader'}}).then(function(r){if(!r.ok)throw new Error('gh '+r.status);return r.json()}).then(function(j){return j&&j.sha?j.sha:null})
    }else{
      var url2='https://api.github.com/repos/'+encodeURIComponent(user)+'/'+encodeURIComponent(repo)+'/commits?per_page=1'
      promise=fetch(url2,{headers:{'Accept':'application/vnd.github+json','X-Requested-With':'cdns','User-Agent':'cdns-loader'}}).then(function(r){if(!r.ok)throw new Error('gh '+r.status);return r.json()}).then(function(j){return Array.isArray(j)&&j[0]&&j[0].sha?j[0].sha:null})
    }
    promise=promise.then(function(sha){return sha||''}).catch(function(){return ''})
    repoCommitCache.set(cacheKey,promise)
    return promise
  }

  function processElement(element){
    if(!element||element.getAttribute(processedAttributeName))return
    var spec=element.getAttribute('cdn')
    var parsed=parseCdnSpec(spec)
    if(!parsed)return
    var lg=(parsed.params&&parsed.params.lg)||'0'
    resolveCommitHash(parsed.user,parsed.repo,parsed.params).then(function(commit){
      if(!commit)return
      var attr=selectTargetAttribute(element)
      if(!attr)return
      var url=buildUrl(parsed.user,parsed.repo,commit,parsed.path,lg)
      var tagName=element.tagName.toLowerCase()
      if(tagName==='script'&&element.parentNode){
        var clone=document.createElement('script')
        var atts=element.attributes
        for(var ai=0;ai<atts.length;ai++){
          var a=atts[ai]
          var n=a.name
          if(n==='cdn'||n===processedAttributeName||n==='src'||n==='href')continue
          clone.setAttribute(n,a.value)
        }
        clone.setAttribute(attr,url)
        clone.setAttribute(processedAttributeName,'1')
        element.parentNode.replaceChild(clone,element)
      }else{
        element.setAttribute(attr,url)
        element.setAttribute(processedAttributeName,'1')
        element.removeAttribute('cdn')
      }
    })
  }

  function processExisting(){
    var nodes=document.querySelectorAll('[cdn]')
    for(var i=0;i<nodes.length;i++)processElement(nodes[i])
  }

  function observe(){
    var observer=new MutationObserver(function(mutations){
      for(var i=0;i<mutations.length;i++){
        var m=mutations[i]
        if(m.type==='attributes'&&m.attributeName==='cdn'&&m.target&&m.target.nodeType===1){
          processElement(m.target)
        }
        if(m.type==='childList'){
          if(m.addedNodes&&m.addedNodes.length){
            for(var j=0;j<m.addedNodes.length;j++){
              var node=m.addedNodes[j]
              if(node.nodeType===1){
                if(node.hasAttribute&&node.hasAttribute('cdn'))processElement(node)
                var descendants=node.querySelectorAll?node.querySelectorAll('[cdn]'):[]
                for(var k=0;k<descendants.length;k++)processElement(descendants[k])
              }
            }
          }
        }
      }
    })
    observer.observe(document.documentElement||document,{subtree:true,childList:true,attributes:true,attributeFilter:['cdn']})
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){processExisting();observe()})
  }else{
    processExisting();observe()
  }
})();

