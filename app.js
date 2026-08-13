const requirements = [
  ['026-3.4.1','026','The onboard equipment shall supervise the permitted speed and distance to target.','Mandatory'],
  ['026-3.6.2','026','The system shall calculate a dynamic speed profile from available track data.','Mandatory'],
  ['026-4.2.8','026','The driver shall be informed when a new movement authority is received.','Mandatory'],
  ['026-5.1.3','026','National values may be updated while the train is at standstill.','Optional'],
  ['034-2.3.1','034','The train interface shall provide the current direction controller position.','Mandatory'],
  ['034-3.2.4','034','Brake command interfaces shall provide defined safe states.','Mandatory'],
  ['034-A.1','034','Interface timing examples are provided for implementation guidance.','Informative'],
  ['036-4.1.2','036','The Eurobalise shall transmit a telegram when energized by the tele-powering signal.','Mandatory'],
  ['036-5.4.3','036','The air-gap interface shall meet the specified field-strength limits.','Mandatory'],
  ['036-B.2','036','Reference installation arrangements may be used during laboratory testing.','Informative'],
  ['091-3.2.1','091','Safety-related failures shall transition the system to a defined safe state.','Mandatory'],
  ['091-4.4.6','091','Diagnostic information should support post-event safety analysis.','Optional']
].map(([id,subset,text,status])=>({id,subset,text,status,selected:false}));

const list=document.querySelector('#requirementList'), search=document.querySelector('#searchInput'), count=document.querySelector('#visibleCount'), empty=document.querySelector('#emptyState'), selectAll=document.querySelector('#selectAll');
const checkedValues=name=>[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(x=>x.value);
function visible(){const q=search.value.trim().toLowerCase(), subsets=checkedValues('subset'), statuses=checkedValues('status');return requirements.filter(r=>subsets.includes(r.subset)&&statuses.includes(r.status)&&(`${r.id} ${r.text}`).toLowerCase().includes(q))}
function render(){const rows=visible();count.textContent=rows.length;empty.hidden=rows.length>0;list.innerHTML=rows.map(r=>`<article class="requirement"><input type="checkbox" data-id="${r.id}" ${r.selected?'checked':''} aria-label="Select ${r.id}"><span class="req-id">${r.id}</span><span class="req-text">${r.text}</span><span class="tag ${r.status}">${r.status}</span></article>`).join('');selectAll.checked=rows.length>0&&rows.every(r=>r.selected);selectAll.indeterminate=rows.some(r=>r.selected)&&!rows.every(r=>r.selected)}
document.addEventListener('change',e=>{if(e.target.matches('[name="subset"],[name="status"]'))render();if(e.target.dataset.id){requirements.find(r=>r.id===e.target.dataset.id).selected=e.target.checked;render()}});search.addEventListener('input',render);selectAll.addEventListener('change',()=>{visible().forEach(r=>r.selected=selectAll.checked);render()});
document.querySelector('#resetBtn').addEventListener('click',()=>{document.querySelectorAll('.filters input[type=checkbox]').forEach(x=>x.checked=true);search.value='';requirements.forEach(r=>r.selected=false);render()});
document.querySelector('#exportBtn').addEventListener('click',()=>{let rows=requirements.filter(r=>r.selected);if(!rows.length)rows=visible();const csv=['ID,Subset,Status,Requirement',...rows.map(r=>[r.id,`Subset-${r.subset}`,r.status,`"${r.text.replaceAll('"','""')}"`].join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='unisig-subset.csv';a.click();URL.revokeObjectURL(a.href)});render();
