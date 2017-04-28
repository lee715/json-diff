'use strict'

const co = require('co')
const _ = require('lodash')
const assert = require('assert')
const diff = require('../diff')

let fromJson = {
  mov1: {
    mov2: 1,
    del1: 1,
    stay1: 1
  },
  del2: {
    mov3: 1,
    del3: 1
  },
  stay2: {
    mov4: 1,
    del4: 1,
    stay4: 1
  }
}

let toJson = {
  mov2: {
    mov1: {
      stay1: 1
    }
  },
  mov3: {
    cre3: {
      mov4: 1
    }
  },
  stay2: {
    stay4: 1,
    cre2: 1
  },
  cre1: 1
}

let actions = diff.getMinActions(fromJson, toJson)
co(function * () {
  let toTree = yield diff.updateTreeByActions(fromJson, actions, empty, empty, empty)
  for (let key in toTree) {
    let parent = toTree[key]
    if (parent && toTree[parent] === undefined) delete toTree[key]
  }
  assert.ok(_.isEqual(toTree, diff.buildTree(toJson)))
}).catch(function (err) {
  console.log(err.stack)
  throw err
})

function * empty () {}

