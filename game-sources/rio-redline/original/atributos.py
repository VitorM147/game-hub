from progresso import MELHORIAS_LIMITE, salva

ATRIBUTOS = ['velocidade', 'aceleracao', 'nitro', 'resistencia']
NOMES = {'velocidade': 'Velocidade', 'aceleracao': 'Aceleração', 'nitro': 'Nitro', 'resistencia': 'Resistência'}
NIVEL_MAXIMO = 10
NIVEL_REFERENCIA = 3
GANHO_POR_NIVEL = 0.05
MELHORIAS_MAXIMAS = MELHORIAS_LIMITE
CUSTO_BASE_MELHORIA = 200
FATOR_PRECO_CARRO = 0.1


def multiplicador(nivel):
    return 1 + (nivel - NIVEL_REFERENCIA) * GANHO_POR_NIVEL


def melhorias_do_carro(progresso, carro):
    return progresso['melhorias'].get(carro['id'], {})


def nivel(progresso, carro, atributo):
    base = carro['atributos'][atributo]
    return min(NIVEL_MAXIMO, base + melhorias_do_carro(progresso, carro).get(atributo, 0))


def multiplicadores(progresso, carro):
    return {atributo: multiplicador(nivel(progresso, carro, atributo)) for atributo in ATRIBUTOS}


def pode_melhorar(progresso, carro, atributo):
    feitas = melhorias_do_carro(progresso, carro).get(atributo, 0)
    return feitas < MELHORIAS_MAXIMAS and nivel(progresso, carro, atributo) < NIVEL_MAXIMO


def custo_melhoria(progresso, carro, atributo):
    feitas = melhorias_do_carro(progresso, carro).get(atributo, 0)
    return int((CUSTO_BASE_MELHORIA + carro['preco'] * FATOR_PRECO_CARRO) * (feitas + 1))


def compra_melhoria(progresso, carro, atributo):
    if carro['id'] not in progresso['desbloqueados']:
        return 'bloqueado'
    if not pode_melhorar(progresso, carro, atributo):
        return 'maximo'
    custo = custo_melhoria(progresso, carro, atributo)
    if progresso['moedas'] < custo:
        return 'sem_moedas'
    progresso['moedas'] -= custo
    melhorias = progresso['melhorias'].setdefault(carro['id'], {})
    melhorias[atributo] = melhorias.get(atributo, 0) + 1
    salva(progresso)
    return 'ok'
