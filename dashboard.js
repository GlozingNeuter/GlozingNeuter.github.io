importScripts("https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/0.14.1/dist/wheels/bokeh-2.4.3-py3-none-any.whl', 'https://cdn.holoviz.org/panel/0.14.1/dist/wheels/panel-0.14.1-py3-none-any.whl', 'pyodide-http==0.1.0', 'matplotlib', 'numpy', 'pandas', 'seaborn']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  
import asyncio

from panel.io.pyodide import init_doc, write_doc

init_doc()

import panel as pn
import numpy as np
import pandas as pd
import seaborn as sns
import numpy as np
import io
import pandas as pd
from panel.widgets import Tabulator
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
from matplotlib import cm
from matplotlib.markers import MarkerStyle

pn.extension()

def script2df(script):
    size = [] # Taille totale
    new = [] # Nouveaux alliéd
    len_allies = []
    last = [] 
    already_seen = []
    exploration =[]
    antiprogramme = []
    NAA = []  # NAA = nouveau acteurs agrégés
    NAP = []  # NAP = nouveau acteurs perdus
    version = []
    d = {}
    v = 1
    naa = 0
    label = []

    buf = io.StringIO(script)
    lines = buf.readlines()
    # Itère pour chaque version du script
    for i in lines :
        lst_a = []
        lst_n = []
        nap = 0
        allié = []
        anti = []
        nouveau = []
        split = i.split(":")
        time = split[0]
        split2 = split[1].split("-//-")
        actants = split2[0].split( )
        all_anti=split2[1].split( )
        size.append(len(actants))
        NAA.append(naa)
        naa = 0
        naa_list = []
        naa_dict = {}


        # Ignore les saut de ligne (\\n)
        if actants[-1] == "n" :
            actants = actant[1:-2]
        
        # Itère entre tout les actants d'une version
        for j in actants :
            # Compte les antiprogramme
            # if j[:1] == "-" :
            #     anti.append(j) 
            # else :
                if j in last and j not in lst_a :
                    naa += 1
                    naa_list.append(j)
                if j in last :
                    lst_a.append(j)
                    allié.append(j)
                    # if j in tmp_a :
                    #     naa += 1
                else :
                    lst_n.append(j)
                if j not in already_seen:
                    already_seen.append(j)
                if j not in allié :
                    nouveau.append(j)
        label.append(time)
        for k in last :
            if k not in actants :
                nap += 1   

        for i in all_anti:
            anti.append(i)

        last = actants
        new.append(len(actants)-len(allié))
        len_allies.append(len(allié))
        exploration.append(len(already_seen))
        antiprogramme.append(len(anti))
        NAP.append(nap)


        version = {"Version": time, "Allié": allié, "Nouveau": nouveau, "Antiprogramme": anti}
        d[v] = version
        v += 1

    data = pd.DataFrame(d).T
    df = pd.DataFrame(zip(size, len_allies, new, exploration, NAP, NAA, antiprogramme), columns=["Taille","Alliés","Nouveaux","Exploration","NAP","NAA", "Anti-Programme"])
    
    df.reset_index(inplace=True)
    df["index"] += 1

    # Calculer l'indice de négociation
    # Plus cet indice est petit moins l'innovateur doit négocier son projet pour le maintenir en existence.
    # Inversement, une valeur élevée de cet indice signifie que le projet est en grande partie renégocié. 

    df['IN'] = df.apply(lambda row: row['Nouveaux'] / row['Taille'], axis = 1)
    df['ANC'] = df['Nouveaux'].cumsum()
    df['P'] = df['Nouveaux'].diff()
    df['IR'] = df.apply(lambda row : (row['NAA'].cumsum() - row['NAP'].cumsum())/ row['Exploration'],axis = 1)

    for i in range(1, len(df)):
        df.loc[i, "IS"] = df.loc[i, "Alliés"] / df.loc[i-1, "Taille"]

    df.set_index("index", inplace=True)
    df_full = df.join(data["Version"])

    return df_full



def basicgraph(df) :

    fig = Figure(figsize= (8, 6))
    ax = fig.subplots()

    y = 0

    markerpro = dict(marker='o', linestyle=':', markersize=15,
                            color='darkgrey',
                            markerfacecolor='tab:blue',
                            markerfacecoloralt='lightsteelblue',
                            markeredgecolor='skyblue')

    markeranti = dict(marker='o', linestyle=':', markersize=15,
                            color='firebrick',
                            markerfacecolor='tab:red',
                            markerfacecoloralt='firebrick',
                            markeredgecolor='tomato')

    for version in df.index:

        pros = int(df["Alliés"][version])
        for pro in range(pros):
            m = MarkerStyle("o")
            ax.plot(pro*10, y*10, **markerpro)
        if df["Anti-Programme"][version] != 0:
            antis = df["Anti-Programme"][version]
            for anti in  range(antis):
                m2 = MarkerStyle("o")
                ax.plot((pro+anti)*10, y*10, **markeranti)
        y +=1


    ax.invert_yaxis()
    ax.set_xlabel("")
    ax.set_ylabel("OU")
    ax.axes.xaxis.set_ticks([])
    ax.axes.yaxis.set_ticks([])
    ax.set_title('ET')
    fig.suptitle("Graphique Socio-technique")

    plt.arrow(-7, 5, 200, 0, width=0.5, head_width=3, color = "black")
    plt.arrow(-7, 5, 0, 100, width=0.5, head_width=3, color = "black")

    for pos in ['right', 'top', 'bottom', 'left']:
        plt.gca().spines[pos].set_visible(False)

    return fig

def complexgraph(df) :

    labels = df["Version"].tolist()
    
    fig = Figure(figsize= (8, 9))
    ax = fig.subplots()

    fig.suptitle('Graphique sociotechnique avec indicateur de négociation')

    ax.xaxis.tick_top()
    ax.set_xlabel("ET")
    ax.xaxis.set_label_position('top') 
    ax.set_ylabel("OU")
    ax.invert_yaxis() 
    ax.set_yticks(df["IN"].cumsum(), labels=labels, size=8)

    ax.hlines(xmin = 0, xmax = df["Taille"], y = df["IN"].cumsum(), linewidth=7)
    ax.hlines(xmin = df["Taille"], xmax = (df["Taille"] + df["Anti-Programme"]), y = df["IN"].cumsum(), colors="red")

    return fig

def indicateursgraph(df) :

    fig = Figure(figsize= (10,7), tight=True)
    ax = fig.subplots(3,2)

    fig.suptitle('Indicateurs sociotechniques')


    ax[0,0].plot(df.reset_index()["index"], df["Taille"], label = "Taille")
    ax[0,0].plot(df.reset_index()["index"], df["Alliés"], label = "Alliés")
    ax[0,0].plot(df.reset_index()["index"], df["Nouveaux"], label = "Nouveaux")
    ax[0,0].legend()
    # df.plot(x = "index", y = ["Taille","Alliés","Nouveaux"])
    # df.plot(x = "index", y = ["ANC", "Exploration"])

    ax[1,0].plot(df.reset_index()["index"], df["ANC"], label = "ANC")
    ax[1,0].plot(df.reset_index()["index"], df["Exploration"], label = "Exploration")
    ax[1,0].legend()

    ax[2,0].plot(df.reset_index()["index"], df["Anti-Programme"], label = "Anti-Programme")
    ax[2,0].set_title('Anti-programme')

    ax[0,1].plot(df.reset_index()["index"], df['IR'])
    ax[0,1].set_title('Indice de rendement')

    ax[1,1].plot(df.reset_index()["index"], df['IS'])
    ax[1,1].set_title("Indice de solidité")

    ax[2,1].plot(df.reset_index()["index"], df['IN'])
    ax[2,1].set_title("Indice de négociation")

    return fig



def callback(target, event):
    print(script2df(event.new))
    target.value = script2df(event.new)

def dftosimplegraph(target, event):
    print(basicgraph(event.new))
    target.object = basicgraph(event.new)

def dftocomplexgraph(target,event):
    target.object = complexgraph(event.new)

def dftoindicateursgraph(target,event):
    target.object = indicateursgraph(event.new)

placeholder = """nom1 : actant1 actant 2 actant3 -//-
nom2 : actant1 actant2 actant3 actant4 -//- actant5 actant6
nom4 : actant7 -//- 
nom5 : actant1 actant2 actant3 actant7 -//- 
"""

mpl_pane1 = pn.pane.Matplotlib(Figure(figsize= (8, 6)), dpi=150)
mpl_pane1.param.trigger('object')

mpl_pane2 = pn.pane.Matplotlib(Figure(figsize= (8, 9)), dpi=150)
mpl_pane2.param.trigger('object')

mpl_pane3 = pn.pane.Matplotlib(Figure(figsize=(10,7)), dpi=200, tight=True)
mpl_pane3.param.trigger('object')

text_area_input = pn.widgets.input.TextAreaInput(name='Script',width=700, height= 300)
text_area_input.value = placeholder

summary = Tabulator(pd.DataFrame(script2df(placeholder)))
summary.link(mpl_pane1, callbacks={'value' : dftosimplegraph})
summary.link(mpl_pane2, callbacks={'value' : dftocomplexgraph})
summary.link(mpl_pane3, callbacks={'value' : dftoindicateursgraph})

text_area_input.link(summary, callbacks={'value' : callback})

filename, download_button = summary.download_menu(
    text_kwargs={'name': 'Enter filename', 'value': 'summary.csv'},
    button_kwargs={'name': 'Download table'}
)

markdown = pn.pane.Markdown("""
### Générateur de graphique sociotechnique

 - Chaque actant doit être en un mot

 - Les actants doivent être séparés d'un espace

 - Chaque version occupe une ligne

 - Une ligne de front "-//-" doit finir chaque ligne

 - Les anti-programmes peuvent être renseigner après la ligne de front en les débutant d'un "-"
""")


dashboard = pn.Column(
            pn.Row(text_area_input,pn.Column(markdown, filename, download_button)),
            summary, 
            pn.Row(mpl_pane1,mpl_pane2),
            mpl_pane3
            ).servable()

await write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.runPythonAsync(`
    import json

    state.curdoc.apply_json_patch(json.loads('${msg.patch}'), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads("""${msg.location}""")
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()