document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('jobContainer');
  const jobId = container.dataset.jobId;

  const pageLoading = document.getElementById('pageLoading');
  const pageContent = document.getElementById('pageContent');
  
  const jobTitleDisplay = document.getElementById('jobTitleDisplay');
  const jobDate = document.getElementById('jobDate');
  const candidateCount = document.getElementById('candidateCount');
  const jobSkills = document.getElementById('jobSkills');
  const jobDescriptionDisplay = document.getElementById('jobDescriptionDisplay');
  const jobDescriptionContainer = document.getElementById('jobDescriptionContainer');
  
  const rankingsTableBody = document.getElementById('rankingsTableBody');
  const emptyRankings = document.getElementById('emptyRankings');

  let currentRankings = [];

  // ---- LOAD DATA ----
  async function loadJobData() {
    try {
      const data = await apiRequest(`/api/admin/jobs/${jobId}/rankings`);
      const { job, rankings } = data;
      currentRankings = rankings;

      // Render Job Details
      jobTitleDisplay.textContent = job.title;
      jobDate.textContent = formatDate(job.created_at);
      candidateCount.textContent = `${rankings.length} candidate${rankings.length !== 1 ? 's' : ''}`;
      
      jobSkills.innerHTML = job.required_skills.split(',').map(s => 
        `<span class="px-3 py-1 bg-primary/10 text-primary font-label-md rounded-full text-sm border border-primary/20">${s.trim()}</span>`
      ).join('');

      if (job.description) {
        jobDescriptionDisplay.textContent = job.description;
        jobDescriptionContainer.classList.remove('hidden');
      }

      // Render Rankings
      renderRankings(rankings);

      pageLoading.classList.add('hidden');
      pageContent.classList.remove('hidden');
      pageContent.style.display = 'flex';

    } catch (error) {
      pageLoading.innerHTML = `
        <div class="text-error mb-4"><span class="material-symbols-outlined text-[48px]">error</span></div>
        <p class="text-on-surface font-headline-md mb-2">Error Loading Data</p>
        <p class="text-on-surface-variant">${error.message}</p>
        <a href="/admin" class="btn-primary mt-6">Back to Dashboard</a>
      `;
    }
  }

  function getStatusHtml(r) {
    const status = (r.status || 'pending').toLowerCase();
    if (status === 'accepted') {
      return `<span class="px-3 py-1.5 rounded-lg text-xs font-label-md bg-[#4CAF50]/15 text-[#4CAF50] border border-[#4CAF50]/30 inline-flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">check_circle</span> Accepted
      </span>`;
    }
    if (status === 'rejected') {
      return `<span class="px-3 py-1.5 rounded-lg text-xs font-label-md bg-error/10 text-error border border-error/20 inline-flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">cancel</span> Rejected
      </span>`;
    }
    // pending — show accept/reject buttons
    return `
      <div class="flex items-center gap-2 justify-center">
        <button onclick="event.stopPropagation(); updateStatus('${r.resume_id}', 'accepted')" class="px-3 py-1.5 rounded-lg text-xs font-label-md bg-[#4CAF50]/15 text-[#4CAF50] border border-[#4CAF50]/40 hover:bg-[#4CAF50]/25 transition-colors inline-flex items-center gap-1" title="Accept">
          <span class="material-symbols-outlined text-[14px]">check</span> Accept
        </button>
        <button onclick="event.stopPropagation(); updateStatus('${r.resume_id}', 'rejected')" class="px-3 py-1.5 rounded-lg text-xs font-label-md bg-error/10 text-error border border-error/30 hover:bg-error/20 transition-colors inline-flex items-center gap-1" title="Reject">
          <span class="material-symbols-outlined text-[14px]">close</span> Reject
        </button>
      </div>
    `;
  }

  function renderRankings(rankings) {
    if (!rankings || rankings.length === 0) {
      document.querySelector('table').parentElement.classList.add('hidden');
      emptyRankings.classList.remove('hidden');
      emptyRankings.style.display = 'flex';
      return;
    }

    rankingsTableBody.innerHTML = rankings.map((r, index) => {
      const name = r.candidate_name || 'Unknown';
      const escapedName = name.replace(/'/g, "\\'");
      return `
      <tr class="border-b border-outline-variant/20 hover:bg-surface-container-lowest/50 transition-colors group">
        <td class="px-6 py-4">
          <div class="w-8 h-8 rounded-full ${index === 0 ? 'bg-[#FFD700]/20 text-[#B8860B]' : index === 1 ? 'bg-[#C0C0C0]/20 text-[#708090]' : index === 2 ? 'bg-[#CD7F32]/20 text-[#8B4513]' : 'bg-surface-container text-on-surface-variant'} flex items-center justify-center font-label-md mx-auto">
            ${index + 1}
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="font-label-md text-on-surface">${name}</div>
          <div class="text-xs text-on-surface-variant">${r.email || 'No email'}</div>
        </td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-2">
            <div class="w-16 h-2 bg-surface-container rounded-full overflow-hidden">
              <div class="h-full bg-primary" style="width: ${r.match_score}%"></div>
            </div>
            <span class="font-label-sm">${Math.round(r.match_score)}%</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 rounded-md text-xs font-label-sm ${getRecommendationBadge(r.recommendation)}">
            ${r.recommendation}
          </span>
        </td>
        <td class="px-6 py-4 text-center">
          <button onclick="openPdfModal('${r.resume_id}', '${escapedName}')" class="group relative px-4 py-2 bg-gradient-to-r from-primary to-tertiary-container text-white font-label-md rounded-xl flex items-center justify-center gap-2 mx-auto overflow-hidden shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap">
            <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span class="material-symbols-outlined text-[18px] relative z-10">visibility</span>
            <span class="relative z-10">View Resume</span>
          </button>
        </td>
        <td class="px-6 py-4 text-center" id="status-${r.resume_id}">
          ${getStatusHtml(r)}
        </td>
      </tr>
      `;
    }).join('');
  }

  function getRecommendationBadge(rec) {
    if (!rec) return 'bg-primary/10 text-primary';
    if (rec.includes('Highly')) return 'bg-[#4CAF50]/15 text-[#4CAF50]';
    if (rec.includes('Consider')) return 'bg-[#B8860B]/10 text-[#B8860B]';
    if (rec.includes('Not')) return 'bg-error/10 text-error';
    return 'bg-primary/10 text-primary';
  }

  // ---- STATUS UPDATE ----
  window.updateStatus = async function(resumeId, status) {
    try {
      await apiRequest(`/api/admin/resumes/${resumeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      // Update in-memory data
      const r = currentRankings.find(x => x.resume_id === resumeId);
      if (r) r.status = status;

      // Update the cell in-place
      const cell = document.getElementById(`status-${resumeId}`);
      if (cell) cell.innerHTML = getStatusHtml(r);

      showToast(`Candidate ${status}!`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error');
    }
  };



  // ---- PDF MODAL LOGIC ----
  const pdfModal = document.getElementById('pdfModal');
  const pdfModalContent = document.getElementById('pdfModalContent');
  const pdfViewer = document.getElementById('pdfViewer');
  const closePdfModalBtn = document.getElementById('closePdfModal');
  const pdfModalTitle = document.getElementById('pdfModalTitle');
  const pdfDownloadBtn = document.getElementById('pdfDownloadBtn');
  const pdfLoading = document.getElementById('pdfLoading');

  window.openPdfModal = function(resumeId, candidateName) {
    pdfModalTitle.textContent = `${candidateName} - Resume`;
    pdfDownloadBtn.href = `/api/admin/resumes/${resumeId}/file?download=true`;
    
    // Show loading spinner
    pdfLoading.classList.remove('hidden');
    pdfViewer.classList.add('opacity-0');
    
    // Set iframe source
    pdfViewer.src = `/api/admin/resumes/${resumeId}/file`;
    
    // Hide loading when iframe loads
    pdfViewer.onload = () => {
      pdfLoading.classList.add('hidden');
      pdfViewer.classList.remove('opacity-0');
    };

    pdfModal.classList.remove('hidden');
    setTimeout(() => {
      pdfModal.classList.remove('opacity-0');
      pdfModalContent.classList.remove('scale-95');
    }, 10);
  };

  function closePdfModal() {
    pdfModal.classList.add('opacity-0');
    pdfModalContent.classList.add('scale-95');
    setTimeout(() => {
      pdfModal.classList.add('hidden');
      pdfViewer.src = ''; // Clear iframe memory
    }, 300);
  }

  closePdfModalBtn.addEventListener('click', closePdfModal);
  pdfModal.addEventListener('click', (e) => {
    if (e.target === pdfModal) closePdfModal();
  });

  // Init
  loadJobData();
});
