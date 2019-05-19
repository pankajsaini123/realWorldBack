'use strict' 
/**
 * Module Dependencies
 */
const mongoose = require('mongoose'),
  Schema = mongoose.Schema;
 
let userSchema = new Schema({
  userId: {
    type: String,
    default: '',
    index: true,
    unique: true
  },
 
  userName: {
    type: String,
    default: ''
  },
 
  password: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  validationToken: { //will generate automatically while resetting password
    type: String,
    default: ''
  },
 
  createdOn :{
    type:Date,
    default:""
  }


})


mongoose.model('User', userSchema);