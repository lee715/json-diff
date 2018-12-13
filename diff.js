'use strict'

const STATUS_DEL = 1
const STATUS_ADD = 2
const STATUS_MOV = 3
const STATUS_STAY = 4

/**
  *  按操作集actionObj中的操作更新一棵树tree
  *  @param tree {object} 非叶子节点为节点唯一id，叶子节点为1，如{a: {b: 1}}
  *  @param actionObj {object} 操作集对象
  *  @param movFn, delFn, creteFn {generateFunction} 操作方法
  *  @return {object} 操作后的树对象
**/
exports.updateTreeByActions = function * (tree, actionObj, movFn, delFn, createFn) {
  let fromTree = exports.buildTree(tree)
  let cacheMap = {}
  let actions = actionObj.movs.concat(actionObj.cres)
  // 先执行移动和创建操作
  for (let action of actions) yield handleAction(action)
  for (let action of actionObj.dels) yield handleDelAction(action)
  return fromTree

  function * handleAction (action) {
    let type = action.action
    // 如果依赖的节点还没有创建，延时处理本次操作
    if (action.parent && fromTree[action.parent] === undefined) {
      cacheMap[action.parent] = cacheMap[action.parent] || []
      cacheMap[action.parent].push(action)
      return
    }
    switch (type) {
      case 'MOV':
        yield movFn(action.id, action.parent)
        fromTree[action.id] = action.parent
      case 'CREATE':
        yield createFn(action.id, action.parent)
        fromTree[action.id] = action.parent
    }
    // 如果有依赖该节点的操作，执行这些操作
    let cached = cacheMap[action.id]
    if (cached && cached.length) {
      for (let c of cached) yield handleAction(c)
    }
    delete cacheMap[action.id]
  }

  function * handleDelAction (action) {
    yield delFn(action.id, action.parent)
    delete fromTree[action.id]
  }
}

/**
  * 获取子节点到父节点的映射表
  * @param obj {object} 对象形式的树结构
  * @return {object}  子节点到父节点的映射表
  * @example {a: {b: 1}} => {a: null, b: 'a'}
**/
exports.buildTree = function (obj) {
  let tree = {}
  _build(null, obj)
  return tree

  function _build (parentId, childTree) {
    // 如果为叶子节点，直接返回
    if (childTree === 1) return
    for (let child in childTree) {
      tree[child] = parentId
      let _childTree = childTree[child]
      // 如果当前子节点不是叶子节点，递归处理
      if (_childTree !== 1) {
        _build(child, _childTree)
      }
    }
  }
}

/**
 *  获取从一棵树(fromJson)转变为另一棵树(toJson)需要的最少操作集(三种基本操作：移动、删除、增加)
 *  @param fromJson, toJson {Object} 非叶子节点为节点唯一id，叶子节点为1，如{a: {b: 1}}
 *  @return {Object} 操作集对象,{movs: [{action: 'MOV', id: 'b', parent: 'a'}..], cres: [..], dels: [..]}
**/
exports.getMinActions = function (fromJson, toJson) {
  let fromTree = exports.buildTree(fromJson)
  let toTree = exports.buildTree(toJson)

  let actions = []
  _diff(fromJson, STATUS_STAY)

  let movs = []
  let dels = []
  for (let action of actions) {
    if (action.action === 'MOV') {
      movs.push(action)
    } else {
      dels.push(action)
    }
  }
  return {movs: movs, dels: dels, cres: getCreateActions(fromTree, toTree)}

  // 递归的提取操作集
  function _diff (tree, status) {
    if (tree === 1) return
    for (let child in tree) {
      let fromParent = fromTree[child]
      let toParent = toTree[child]
      // 删除操作：原树有该节点，目标树没有
      if (fromParent !== undefined && (toParent === undefined)) {
        // 父级操作是移动或者不动，子操作删除
        if (status === STATUS_MOV || status === STATUS_STAY) {
          actions.push({
            action: 'DEL',
            id: child,
            parent: null
          })
        }
        _diff(tree[child], STATUS_DEL)
      // 移动操作: 原树目标树都有该节点，父节点不同
      } else if (fromParent !== undefined && toParent !== undefined && fromParent !== toParent) {
        actions.push({
          action: 'MOV',
          id: child,
          parent: toParent
        })
        _diff(tree[child], STATUS_MOV)
      } else if (status === STATUS_DEL) {
        _diff(tree[child], STATUS_DEL)
      // 无操作
      } else {
        _diff(tree[child], STATUS_STAY)
      }
    }
  }

  // 找到从fromTree变换为toTree需要的新建操作
  function getCreateActions (fromTree, toTree) {
    let actions = []
    for (let child in toTree) {
      if (fromTree[child] === undefined)
        actions.push({
          action: 'CREATE',
          id: child,
          parent: toTree[child]
        })
    }
    return actions
  }
}
