
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';

import app from '../app.js';
import montadoraRepository from '../repositories/montadoraRepository.js';
import clienteRepository from '../repositories/clienteRepository.js';
import veiculoRepository from '../repositories/veiculoRepository.js';

vi.mock('../repositories/montadoraRepository.js', () => ({
    default: {
        criar: vi.fn(),
        editar: vi.fn(),
        deletar: vi.fn(),
        selecionar: vi.fn()
    }
}));

vi.mock('../repositories/clienteRepository.js', () => ({
    default: {
        criar: vi.fn(),
        editar: vi.fn(),
        deletar: vi.fn(),
        selecionar: vi.fn()
    }
}));

vi.mock('../repositories/veiculoRepository.js', () => ({
    default: {
        criar: vi.fn(),
        editar: vi.fn(),
        deletar: vi.fn(),
        selecionar: vi.fn()
    }
}));

vi.mock('axios', () => ({
    default: {
        get: vi.fn()
    }
}));

const enderecoViaCep = {
    cep: '13185880',
    logradouro: 'Rua das Flores',
    bairro: 'Centro',
    localidade: 'Hortolândia',
    uf: 'SP'
};

const clienteValido = {
    nome: 'Florisvaldo Junior',
    cpf: '123.456.789-00',
    cep: '13185880',
    numero: 123,
    complemento: 'Casa'
};

const veiculoValido = {
    idMontadora: 1,
    idCliente: 1,
    modelo: 'Palio',
    placa: 'EAG2356',
    ano: 2010,
    cor: 'Preto',
    valor: 20000
};

describe('Testes de integração da API Automóveis', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        axios.get.mockResolvedValue({ data: enderecoViaCep });

        montadoraRepository.criar.mockResolvedValue({ insertId: 1 });
        montadoraRepository.editar.mockResolvedValue({ affectedRows: 1 });
        montadoraRepository.deletar.mockResolvedValue({ affectedRows: 1 });
        montadoraRepository.selecionar.mockResolvedValue([
            { Id: 1, Nome: 'Fiat', Pais: 'Itália' },
            { Id: 2, Nome: 'Volkswagen', Pais: 'Alemanha' }
        ]);

        clienteRepository.criar.mockResolvedValue({ insertId: 1 });
        clienteRepository.editar.mockResolvedValue({ affectedRows: 1 });
        clienteRepository.deletar.mockResolvedValue({ affectedRows: 1 });
        clienteRepository.selecionar.mockResolvedValue([
            { Id: 1, Nome: 'Ana' },
            { Id: 2, Nome: 'Bruno' }
        ]);

        veiculoRepository.criar.mockResolvedValue({ insertId: 1 });
        veiculoRepository.editar.mockResolvedValue({ affectedRows: 1 });
        veiculoRepository.deletar.mockResolvedValue({ affectedRows: 1 });
        veiculoRepository.selecionar.mockResolvedValue([
            {
                Id: 1,
                Modelo: 'Palio',
                Montadora: 'Fiat',
                Cliente: 'Ana',
                Placa: 'EAG2356'
            }
        ]);
    });

    describe('Montadoras', () => {
        it('CT-001 - cria montadora com dados válidos', async () => {
            const response = await request(app)
                .post('/montadoras')
                .send({ nome: 'Ferrari', pais: 'Itália' });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Montadora criada com sucesso');
            expect(response.body.data.insertId).toBe(1);
            expect(montadoraRepository.criar).toHaveBeenCalledOnce();
        });

        it('CT-002 - rejeita montadora com nome menor que 3 caracteres', async () => {
            const response = await request(app)
                .post('/montadoras')
                .send({ nome: 'Ka', pais: 'Brasil' });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Erro ao criar montadora');
            expect(response.body.error).toBe('Nome inválido');
            expect(montadoraRepository.criar).not.toHaveBeenCalled();
        });

        it('CT-003 - atualiza montadora existente', async () => {
            const response = await request(app)
                .put('/montadoras?id=1')
                .send({ nome: 'Ferrari SA', pais: 'Itália' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Montadora atualizada com sucesso');
            expect(response.body.data.affectedRows).toBe(1);
        });

        it('CT-004 - retorna 404 ao atualizar montadora inexistente', async () => {
            montadoraRepository.editar.mockResolvedValueOnce({ affectedRows: 0 });

            const response = await request(app)
                .put('/montadoras?id=99999')
                .send({ nome: 'Fiat', pais: 'Itália' });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Montadora não encontrada');
            expect(response.body.data).toEqual({});
        });

        it('CT-005 - exclui montadora sem veículos vinculados', async () => {
            const response = await request(app).delete('/montadoras/2');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Montadora deletada com sucesso');
            expect(response.body.data.affectedRows).toBe(1);
            expect(montadoraRepository.deletar).toHaveBeenCalledWith(2);
        });

        it('CT-006 - lista montadoras em ordem alfabética', async () => {
            const response = await request(app).get('/montadoras');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Montadoras selecionadas com sucesso');
            expect(response.body.data.map((item) => item.Nome)).toEqual(['Fiat', 'Volkswagen']);
        });
    });

    describe('Clientes', () => {
        it('CT-007 - cria cliente consultando CEP válido no ViaCEP', async () => {
            const response = await request(app)
                .post('/clientes')
                .send(clienteValido);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Cliente criado com sucesso');
            expect(axios.get).toHaveBeenCalledWith('https://viacep.com.br/ws/13185880/json/');
            expect(clienteRepository.criar).toHaveBeenCalledOnce();

            const clienteEnviado = clienteRepository.criar.mock.calls[0][0];
            expect(clienteEnviado.logradouro).toBe('Rua das Flores');
            expect(clienteEnviado.bairro).toBe('Centro');
            expect(clienteEnviado.cidade).toBe('Hortolândia');
            expect(clienteEnviado.uf).toBe('SP');
            expect(clienteEnviado.cpf).toBe('12345678900');
        });

        it('CT-008 - rejeita cliente com CEP menor que 8 dígitos', async () => {
            const response = await request(app)
                .post('/clientes')
                .send({ ...clienteValido, cep: '131858' });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Erro ao criar cliente');
            expect(response.body.error).toBe('CEP inválido');
            expect(axios.get).not.toHaveBeenCalled();
            expect(clienteRepository.criar).not.toHaveBeenCalled();
        });

        it('CT-009 - rejeita CEP inexistente retornado pelo ViaCEP', async () => {
            axios.get.mockResolvedValueOnce({ data: { erro: true } });

            const response = await request(app)
                .post('/clientes')
                .send({ ...clienteValido, cep: '00000000' });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Erro ao criar cliente');
            expect(response.body.error).toBe('CEP não encontrado');
            expect(clienteRepository.criar).not.toHaveBeenCalled();
        });

        it('CT-010 - atualiza cliente existente e consulta o novo CEP', async () => {
            const response = await request(app)
                .put('/clientes?id=1')
                .send({ ...clienteValido, nome: 'Florisvaldo Atualizado' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Cliente atualizado com sucesso');
            expect(response.body.data.affectedRows).toBe(1);
            expect(clienteRepository.editar).toHaveBeenCalledOnce();
        });

        it('CT-011 - exclui cliente sem veículos vinculados', async () => {
            const response = await request(app).delete('/clientes/1');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Cliente deletado com sucesso');
            expect(response.body.data.affectedRows).toBe(1);
            expect(clienteRepository.deletar).toHaveBeenCalledWith(1);
        });

        it('CT-012 - lista clientes em ordem alfabética', async () => {
            const response = await request(app).get('/clientes');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Clientes selecionados com sucesso');
            expect(response.body.data.map((item) => item.Nome)).toEqual(['Ana', 'Bruno']);
        });
    });

    describe('Veículos', () => {
        it('CT-013 - cria veículo com cliente e montadora existentes', async () => {
            const response = await request(app)
                .post('/veiculos')
                .send(veiculoValido);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Veículo criado com sucesso');
            expect(response.body.data.insertId).toBe(1);
            expect(veiculoRepository.criar).toHaveBeenCalledOnce();
        });

        it('CT-014 - retorna erro ao criar veículo com montadora inexistente', async () => {
            veiculoRepository.criar.mockRejectedValueOnce(
                new Error('Cannot add or update a child row: a foreign key constraint fails')
            );

            const response = await request(app)
                .post('/veiculos')
                .send({ ...veiculoValido, idMontadora: 99999 });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Erro ao criar veículo');
            expect(response.body.error).toContain('foreign key constraint');
        });

        it('CT-015 - rejeita veículo com placa menor que 5 caracteres', async () => {
            const response = await request(app)
                .post('/veiculos')
                .send({ ...veiculoValido, placa: 'AB1' });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Erro ao criar veículo');
            expect(response.body.error).toBe('Placa inválida');
            expect(veiculoRepository.criar).not.toHaveBeenCalled();
        });

        it('CT-016 - rejeita veículo com ano acima do permitido', async () => {
            const response = await request(app)
                .post('/veiculos')
                .send({ ...veiculoValido, ano: new Date().getFullYear() + 5 });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Erro ao criar veículo');
            expect(response.body.error).toBe('Ano inválido');
            expect(veiculoRepository.criar).not.toHaveBeenCalled();
        });

        it('CT-017 - atualiza veículo existente', async () => {
            const response = await request(app)
                .put('/veiculos?id=1')
                .send({ ...veiculoValido, modelo: 'Palio GT', valor: 25000 });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Veículo atualizado com sucesso');
            expect(response.body.data.affectedRows).toBe(1);
        });

        it('CT-018 - exclui veículo existente', async () => {
            const response = await request(app).delete('/veiculos/1');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Veículo deletado com sucesso');
            expect(response.body.data.affectedRows).toBe(1);
            expect(veiculoRepository.deletar).toHaveBeenCalledWith(1);
        });

        it('CT-019 - lista veículos com dados de montadora e cliente', async () => {
            const response = await request(app).get('/veiculos');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Veículos selecionados com sucesso');
            expect(response.body.data[0].Montadora).toBe('Fiat');
            expect(response.body.data[0].Cliente).toBe('Ana');
            expect(response.body.data[0].Modelo).toBe('Palio');
        });

        it('CT-020 - bloqueia exclusão de montadora vinculada a veículo', async () => {
            montadoraRepository.deletar.mockRejectedValueOnce(
                new Error('Cannot delete or update a parent row: a foreign key constraint fails')
            );

            const response = await request(app).delete('/montadoras/1');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Erro ao deletar montadora');
            expect(response.body.error).toContain('foreign key constraint');
        });
    });
});
