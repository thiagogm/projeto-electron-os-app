// electron-os-app/Models/cliente_schema.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {Object} Client
 * @property {String} name - Nome completo do cliente (obrigatório, mínimo 3 caracteres).
 * @property {String} cpf - CPF do cliente (obrigatório, único, armazenado sem máscara, 11 dígitos).
 * @property {String} phone - Telefone/Celular do cliente (obrigatório, armazenado sem máscara).
 * @property {String} email - Endereço de e-mail do cliente (deve ser válido se fornecido, armazenado em minúsculas).
 * @property {String} cep - CEP do cliente (armazenado sem máscara, 8 dígitos).
 * @property {String} address - Logradouro do endereço.
 * @property {String} number - Número do endereço.
 * @property {String} complement - Complemento do endereço.
 * @property {String} neighborhood - Bairro do endereço.
 * @property {String} city - Cidade do endereço.
 * @property {String} state - UF do endereço (2 caracteres, maiúsculas).
 * @property {String} notes - Observações adicionais sobre o cliente.
 * @property {Date} createdAt - Data de criação do registro (automático).
 * @property {Date} updatedAt - Data da última atualização do registro (automático).
 */
const clientSchema = new Schema({
    name: {
        type: String,
        required: [true, 'O nome completo do cliente é obrigatório.'],
        trim: true,
        minlength: [3, 'O nome do cliente deve ter pelo menos 3 caracteres.']
    },
    cpf: {
        type: String,
        required: [true, 'O CPF do cliente é obrigatório.'],
        unique: true, // Garante que não hajam CPFs duplicados no banco
        trim: true,
        // Validação para garantir que, após a limpeza no hook pre('save'),
        // o CPF tenha exatamente 11 dígitos.
        validate: {
            validator: function(v) {
                // Esta validação roda APÓS o hook pre('save') que limpa o CPF.
                // Então, aqui 'v' já deve ser apenas dígitos.
                return /^\d{11}$/.test(v);
            },
            message: props => `${props.value} não é um CPF com 11 dígitos válidos após a limpeza!`
        }
    },
    phone: {
        type: String,
        required: [true, 'O telefone do cliente é obrigatório.'],
        trim: true
        // Poderia adicionar uma validação de 'match' aqui também após a limpeza,
        // por exemplo, para garantir entre 10 e 11 dígitos:
        // validate: {
        //   validator: function(v) { return /^\d{10,11}$/.test(v); }, // 'v' já estará limpo pelo hook pre-save
        //   message: props => `${props.value} não é um telefone com 10 ou 11 dígitos válidos!`
        // }
    },
    email: {
        type: String,
        trim: true,
        lowercase: true, // Armazena o e-mail em minúsculas para consistência
        match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Formato de e-mail inválido.'],
        // Opcional: tornar o e-mail único se for um requisito de negócio
        // unique: true, 
        // sparse: true, // Necessário para 'unique' em campos não obrigatórios para permitir múltiplos nulos/ausentes
    },
    cep: {
        type: String,
        trim: true,
        // Validação para garantir que, após a limpeza no hook pre('save'),
        // o CEP tenha exatamente 8 dígitos, se preenchido.
        validate: {
            validator: function(v) {
                if (!v) return true; // Permite CEP vazio, pois não é 'required'
                return /^\d{8}$/.test(v); // 'v' já estará limpo pelo hook pre-save
            },
            message: props => `${props.value} não é um CEP com 8 dígitos válidos!`
        }
    },
    address: { 
        type: String, 
        trim: true 
    },
    number: { 
        type: String, 
        trim: true 
    },
    complement: { 
        type: String, 
        trim: true 
    },
    neighborhood: { 
        type: String, 
        trim: true 
    },
    city: { 
        type: String, 
        trim: true 
    },
    state: {
        type: String,
        trim: true,
        uppercase: true, // Armazena UF em maiúsculas
        minlength: [2, 'UF deve ter 2 caracteres.'],
        maxlength: [2, 'UF deve ter 2 caracteres.']
    },
    notes: { 
        type: String, 
        trim: true 
    }
}, {
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Middleware (hook) para remover máscara do CPF, Telefone e CEP ANTES de salvar.
clientSchema.pre('save', function(next) {
  // 'this' se refere ao documento que está prestes a ser salvo.
  if (this.isModified('cpf') || this.isNew) {
    this.cpf = (this.cpf || '').replace(/\D/g, ''); // Remove não dígitos
  }
  if (this.isModified('phone') || this.isNew) {
    this.phone = (this.phone || '').replace(/\D/g, ''); // Remove não dígitos
  }
  if (this.isModified('cep') || this.isNew) {
    if (this.cep) { // Só processa se o CEP não for nulo ou undefined
        this.cep = (this.cep || '').replace(/\D/g, ''); // Remove não dígitos
    } else {
        this.cep = undefined; // Garante que seja undefined se vazio, para não salvar string vazia se não desejado
    }
  }
  next(); // Continua com a operação de salvar
});

// Exportar o MODELO compilado pelo Mongoose.
module.exports = mongoose.model('Client', clientSchema);
