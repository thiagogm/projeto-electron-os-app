// electron-os-app/Models/os_schema.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

/**
 * @typedef {Object} PartSubdocument
 * @property {String} name - Nome da peça (obrigatório).
 * @property {Number} quantity - Quantidade da peça (obrigatório, mínimo 1).
 * @property {Number} unitPrice - Preço unitário da peça (obrigatório, mínimo 0).
 * @property {Number} totalPrice - Preço total para esta peça (calculado: quantidade * preço unitário).
 */
const partSchema = new Schema({
    name: {
        type: String,
        required: false,
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'A quantidade da peça é obrigatória.'],
        min: [1, 'A quantidade da peça deve ser pelo menos 1.']
    },
    unitPrice: {
        type: Number,
        required: [true, 'O preço unitário da peça é obrigatório.'],
        min: [0, 'O preço unitário da peça não pode ser negativo.']
    },
    totalPrice: { 
        type: Number,
        default: 0
    }
}, {
    _id: false 
});

/**
 * @typedef {Object} ServiceOrder
 * @property {String} osNumber - Número da Ordem de Serviço (obrigatório, único, uppercase).
 * @property {ObjectId} clientId - ID do cliente associado (obrigatório, referência ao modelo 'Client').
 * @property {String} clientName - Nome do cliente (denormalizado, obrigatório).
 * @property {String} clientCpf - CPF do cliente (denormalizado, armazenado sem máscara).
 * @property {String} clientPhone - Telefone do cliente (denormalizado, armazenado sem máscara).
 * @property {String} equipment - Descrição do equipamento (obrigatório).
 * @property {String} accessories - Acessórios deixados com o equipamento.
 * @property {String} reportedIssue - Defeito relatado pelo cliente (obrigatório).
 * @property {String} technicianNotes - Observações técnicas e diagnóstico.
 * @property {String} servicePerformed - Descrição do serviço realizado.
 * @property {String} status - Status atual da OS (obrigatório, enum, default: 'Aberta').
 * @property {Date} entryDate - Data de entrada da OS (default: data atual).
 * @property {Date} completionDate - Data de finalização da OS (gerenciada por status).
 * @property {Array<PartSubdocument>} parts - Lista de peças utilizadas.
 * @property {Number} laborCost - Custo da mão de obra (default: 0, mínimo 0).
 * @property {Number} otherCosts - Outros custos (default: 0, mínimo 0).
 * @property {Number} totalCost - Custo total da OS (calculado, default: 0, mínimo 0).
 * @property {Date} createdAt - Data de criação do registro (automático).
 * @property {Date} updatedAt - Data da última atualização do registro (automático).
 */
const osSchema = new Schema({
    osNumber: {
        type: String,
        required: [true, 'O número da OS é obrigatório.'],
        unique: true, // Esta opção já cria o índice único para osNumber
        trim: true,
        uppercase: true 
    },
    clientId: {
        type: ObjectId,
        ref: 'Client', 
        required: [true, 'Um cliente deve ser associado à OS.']
    },
    clientName: { // Denormalizado
        type: String,
        required: [true, 'O nome do cliente é obrigatório na OS.'],
        trim: true
    },
    clientCpf: { // Denormalizado e limpo no hook
        type: String,
        trim: true
    },
    clientPhone: { // Denormalizado e limpo no hook
        type: String,
        trim: true
    },
    equipment: {
        type: String,
        required: [true, 'A descrição do equipamento é obrigatória.'],
        trim: true
    },
    accessories: {
        type: String,
        trim: true,
        default: ''
    },
    reportedIssue: {
        type: String,
        required: [true, 'O defeito relatado pelo cliente é obrigatório.'],
        trim: true
    },
    technicianNotes: {
        type: String,
        trim: true,
        default: ''
    },
    servicePerformed: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        required: true,
        enum: {
            values: ['Aberta', 'Em Análise', 'Aguardando Aprovação', 'Aguardando Peças', 'Em Reparo', 'Finalizada', 'Cancelada', 'Entregue'],
            message: '{VALUE} não é um status válido para Ordem de Serviço.'
        },
        default: 'Aberta'
    },
    entryDate: {
        type: Date,
        default: Date.now 
    },
    completionDate: {
        type: Date,
        default: null 
    },
    parts: [partSchema], 
    laborCost: {
        type: Number,
        default: 0,
        min: [0, 'O custo de mão de obra não pode ser negativo.']
    },
    otherCosts: {
        type: Number,
        default: 0,
        min: [0, 'Outros custos não podem ser negativos.']
    },
    totalCost: { 
        type: Number,
        default: 0,
        min: [0, 'O custo total não pode ser negativo.']
    }
}, {
    timestamps: true 
});

osSchema.pre('save', function(next) {
    let calculatedPartsTotal = 0;
    if (this.parts && this.parts.length > 0) {
        this.parts.forEach(part => {
            part.totalPrice = (part.quantity || 0) * (part.unitPrice || 0);
            calculatedPartsTotal += part.totalPrice;
        });
    }

    if (this.isModified('parts') || this.isModified('laborCost') || this.isModified('otherCosts') || this.isNew) {
        this.totalCost = calculatedPartsTotal + (this.laborCost || 0) + (this.otherCosts || 0);
    }

    if (this.isModified('status') || this.isNew) {
        if (this.status === 'Finalizada' && !this.completionDate) {
            this.completionDate = new Date();
        } else if (this.status !== 'Finalizada' && this.completionDate) {
            this.completionDate = null;
        }
    }
    
    if (this.isModified('clientCpf') || (this.isNew && this.clientCpf)) {
        this.clientCpf = (this.clientCpf || '').replace(/\D/g, '');
    }
    if (this.isModified('clientPhone') || (this.isNew && this.clientPhone)) {
        this.clientPhone = (this.clientPhone || '').replace(/\D/g, '');
    }

    next();
});

// Índices para otimização de consultas
osSchema.index({ status: 1, entryDate: -1 }); 
osSchema.index({ clientId: 1 });

module.exports = mongoose.model('ServiceOrder', osSchema);
