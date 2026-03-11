import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase.js';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  orderBy,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { FiPlus, FiEdit, FiTrash2, FiUser, FiChevronDown, FiChevronUp, FiSearch, FiExternalLink } from 'react-icons/fi';

const Container = styled.div`
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #2980b9, #21618c);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ProposalCard = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  overflow: hidden;
`;

const ProposalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8f9fa;
  cursor: pointer;
  
  &:hover {
    background: #e9ecef;
  }
`;

const ProposalInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ProjectHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ProjectName = styled.h3`
  font-size: 1.25rem;
  color: #333;
  margin: 0;
`;

const StatusSummary = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #666;
`;

const StatusCount = styled.span`
  font-weight: bold;
  color: ${props => props.color || '#666'};
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  
  &:hover {
    color: #333;
  }
`;

const ProposalBody = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
`;

const InfluencerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InfluencerItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
`;

const InfluencerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const InfluencerName = styled.span`
  font-weight: 500;
  color: #333;
`;

const StatusSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: ${props => getStatusColor(props.value)};
  color: white;
  font-weight: 500;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const DeleteButton = styled(IconButton)`
  background: #e74c3c;
  color: white;
  
  &:hover {
    background: #c0392b;
  }
`;

const DetailButton = styled(IconButton)`
  background: #3498db;
  color: white;
  
  &:hover {
    background: #2980b9;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  font-weight: bold;
  color: #555;
  font-size: 0.9rem;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 0.5rem;
`;

const SearchInput = styled(Input)`
  width: 100%;
  padding-right: 2.5rem;
`;

const SearchIcon = styled.div`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
`;

const DealList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
`;

const DealItem = styled.div`
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid #eee;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  ${props => props.selected && `
    background: #e3f2fd;
    font-weight: 500;
  `}
`;

const DealName = styled.div`
  font-size: 0.95rem;
  color: #333;
`;

const DealInfo = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.25rem;
`;

const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  
  &:hover {
    background: #f8f9fa;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  
  &:hover {
    background: linear-gradient(135deg, #2980b9, #21618c);
  }
`;

const CancelButton = styled(Button)`
  background: #e0e0e0;
  color: #666;
  
  &:hover {
    background: #d0d0d0;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #999;
`;

const getStatusColor = (status) => {
  switch (status) {
    case '未連絡': return '#95a5a6';
    case '連絡済み': return '#3498db';
    case '交渉中': return '#f39c12';
    case 'OK': return '#27ae60';
    case 'NG': return '#e74c3c';
    case '保留': return '#9b59b6';
    default: return '#95a5a6';
  }
};

const CastingManagePage = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [deals, setDeals] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [expandedProposals, setExpandedProposals] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [formData, setFormData] = useState({
    dealId: '',
    selectedInfluencers: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [filteredDeals, setFilteredDeals] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // 案件の検索フィルタリング
    try {
      if (dealSearchQuery.trim() === '') {
        setFilteredDeals(deals);
      } else {
        const query = dealSearchQuery.toLowerCase();
        const filtered = deals.filter(deal => {
          if (!deal || !deal.productName) return false;
          
          const productNameMatch = deal.productName.toLowerCase().includes(query);
          const proposalMenuMatch = deal.proposalMenu ? deal.proposalMenu.toLowerCase().includes(query) : false;
          const introducerMatch = deal.introducer ? deal.introducer.toLowerCase().includes(query) : false;
          
          return productNameMatch || proposalMenuMatch || introducerMatch;
        });
        setFilteredDeals(filtered);
      }
    } catch (error) {
      console.error('Error filtering deals:', error);
      setFilteredDeals([]);
    }
  }, [dealSearchQuery, deals]);

  const fetchData = async () => {
    try {
      // 案件一覧取得
      const clientsQuery = query(collection(db, 'progressDashboard'), orderBy('createdAt', 'desc'));
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsData = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().productName,
        ...doc.data()
      }));
      setDeals(clientsData);
      setFilteredDeals(clientsData); // 初期表示用

      // インフルエンサー一覧取得
      const influencersQuery = query(collection(db, 'influencers'), orderBy('name'));
      const influencersSnapshot = await getDocs(influencersQuery);
      const influencersData = influencersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInfluencers(influencersData);

      // キャスティング提案一覧取得
      const proposalsQuery = query(collection(db, 'castingProposals'), orderBy('updatedAt', 'desc'));
      const proposalsSnapshot = await getDocs(proposalsQuery);
      const proposalsData = proposalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProposals(proposalsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (proposalId) => {
    setExpandedProposals(prev => ({
      ...prev,
      [proposalId]: !prev[proposalId]
    }));
  };

  const getStatusCounts = (proposal) => {
    const counts = {
      '未連絡': 0,
      '連絡済み': 0,
      '交渉中': 0,
      'OK': 0,
      'NG': 0,
      '保留': 0
    };

    proposal.influencers?.forEach(inf => {
      if (counts.hasOwnProperty(inf.status)) {
        counts[inf.status]++;
      }
    });

    return counts;
  };

  const handleStatusChange = async (proposalId, influencerId, newStatus) => {
    try {
      const proposalRef = doc(db, 'castingProposals', proposalId);
      const proposal = proposals.find(p => p.id === proposalId);
      
      const updatedInfluencers = proposal.influencers.map(inf => 
        inf.influencerId === influencerId 
          ? { ...inf, status: newStatus, updatedAt: new Date() }
          : inf
      );

      await updateDoc(proposalRef, {
        influencers: updatedInfluencers,
        updatedAt: serverTimestamp()
      });

      await fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('ステータスの更新に失敗しました');
    }
  };

  const handleAddProposal = () => {
    setEditingProposal(null);
    setFormData({
      dealId: '',
      selectedInfluencers: []
    });
    setDealSearchQuery('');
    setShowModal(true);
  };

  const handleEditProposal = (proposal) => {
    setEditingProposal(proposal);
    setFormData({
      dealId: proposal.dealId,
      selectedInfluencers: proposal.influencers.map(inf => inf.influencerId)
    });
    setDealSearchQuery('');
    setShowModal(true);
  };

  const handleDeleteProposal = async (proposalId, projectName) => {
    if (window.confirm(`${projectName}の提案を削除してよろしいですか？`)) {
      try {
        await deleteDoc(doc(db, 'castingProposals', proposalId));
        await fetchData();
        alert('削除しました');
      } catch (error) {
        console.error('Error deleting proposal:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const handleInfluencerToggle = (influencerId) => {
    setFormData(prev => ({
      ...prev,
      selectedInfluencers: prev.selectedInfluencers.includes(influencerId)
        ? prev.selectedInfluencers.filter(id => id !== influencerId)
        : [...prev.selectedInfluencers, influencerId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.dealId) {
      alert('案件を選択してください');
      return;
    }

    const selectedDeal = deals.find(d => d.id === formData.dealId);
    if (!selectedDeal) {
      alert('案件が見つかりません');
      return;
    }

    try {
      console.log('Submitting proposal with data:', {
        dealId: formData.dealId,
        selectedInfluencers: formData.selectedInfluencers,
        selectedDeal: selectedDeal
      });

      const proposalData = {
        projectName: selectedDeal.productName,
        dealId: formData.dealId,
        influencers: formData.selectedInfluencers.map(infId => {
          const influencer = influencers.find(inf => inf.id === infId);
          const existingInf = editingProposal?.influencers.find(inf => inf.influencerId === infId);
          return {
            influencerId: infId,
            influencerName: influencer.name,
            status: existingInf?.status || '未連絡',
            updatedAt: existingInf?.updatedAt || new Date()
          };
        }),
        updatedAt: serverTimestamp()
      };
      
      console.log('Proposal data to be saved:', proposalData);

      if (editingProposal) {
        await updateDoc(doc(db, 'castingProposals', editingProposal.id), proposalData);
        console.log('Proposal updated:', editingProposal.id);
        alert('更新しました');
      } else {
        proposalData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'castingProposals'), proposalData);
        console.log('New proposal created with ID:', docRef.id);
        alert('登録しました');
      }

      setShowModal(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving proposal:', error);
      console.error('Error details:', error.message, error.code);
      alert(`保存に失敗しました: ${error.message}`);
    }
  };

  if (isLoading) {
    return <Container>読み込み中...</Container>;
  }

  return (
    <Container>
      <Header>
        <Title>キャスティング進捗管理</Title>
        <AddButton onClick={handleAddProposal}>
          <FiPlus />
          新規提案
        </AddButton>
      </Header>

      {proposals.length === 0 ? (
        <EmptyState>提案がまだ登録されていません</EmptyState>
      ) : (
        proposals.map(proposal => {
          const counts = getStatusCounts(proposal);
          const isExpanded = expandedProposals[proposal.id];

          return (
            <ProposalCard key={proposal.id}>
              <ProposalHeader onClick={() => toggleExpand(proposal.id)}>
                <ProposalInfo>
                  <ProjectHeader>
                    <ProjectName>{proposal.projectName}</ProjectName>
                    <DetailButton
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/product/${proposal.dealId}`);
                      }}
                      title="案件詳細"
                    >
                      <FiExternalLink />
                    </DetailButton>
                  </ProjectHeader>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    {deals.find(d => d.id === proposal.dealId)?.proposalMenu || ''}
                  </div>
                </ProposalInfo>
                <StatusSummary>
                  <StatusItem>
                    打診中: <StatusCount color="#f39c12">{counts['連絡済み'] + counts['交渉中']}名</StatusCount>
                  </StatusItem>
                  <StatusItem>
                    OK: <StatusCount color="#27ae60">{counts['OK']}名</StatusCount>
                  </StatusItem>
                  <StatusItem>
                    NG: <StatusCount color="#e74c3c">{counts['NG']}名</StatusCount>
                  </StatusItem>
                  <ActionButtons>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProposal(proposal);
                      }}
                      title="編集"
                    >
                      <FiEdit />
                    </IconButton>
                    <DeleteButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProposal(proposal.id, proposal.projectName);
                      }}
                      title="削除"
                    >
                      <FiTrash2 />
                    </DeleteButton>
                  </ActionButtons>
                  <ExpandButton>
                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </ExpandButton>
                </StatusSummary>
              </ProposalHeader>
              
              {isExpanded && (
                <ProposalBody>
                  <InfluencerList>
                    {proposal.influencers.map(inf => (
                      <InfluencerItem key={inf.influencerId}>
                        <InfluencerInfo>
                          <FiUser />
                          <InfluencerName>{inf.influencerName}</InfluencerName>
                        </InfluencerInfo>
                        <StatusSelect
                          value={inf.status}
                          onChange={(e) => handleStatusChange(proposal.id, inf.influencerId, e.target.value)}
                        >
                          <option value="未連絡">未連絡</option>
                          <option value="連絡済み">連絡済み</option>
                          <option value="交渉中">交渉中</option>
                          <option value="OK">OK</option>
                          <option value="NG">NG</option>
                          <option value="保留">保留</option>
                        </StatusSelect>
                      </InfluencerItem>
                    ))}
                  </InfluencerList>
                </ProposalBody>
              )}
            </ProposalCard>
          );
        })
      )}

      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              {editingProposal ? 'キャスティング提案編集' : '新規キャスティング提案'}
            </ModalTitle>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>案件名（既存案件から選択）</Label>
                {!editingProposal ? (
                  <>
                    <SearchContainer>
                      <SearchInput
                        type="text"
                        placeholder="案件名または提案メニューで検索"
                        value={dealSearchQuery}
                        onChange={(e) => setDealSearchQuery(e.target.value)}
                      />
                      <SearchIcon>
                        <FiSearch />
                      </SearchIcon>
                    </SearchContainer>
                    <DealList>
                      {filteredDeals.length === 0 ? (
                        <DealItem style={{ textAlign: 'center', color: '#999' }}>
                          該当する案件がありません
                        </DealItem>
                      ) : (
                        filteredDeals.map(deal => (
                          <DealItem
                            key={deal.id}
                            selected={formData.dealId === deal.id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, dealId: deal.id }));
                              setDealSearchQuery('');
                            }}
                          >
                            <DealName>{deal.productName || '名称未設定'}</DealName>
                            <DealInfo>
                              {deal.proposalMenu || ''} 
                              {deal.introducer && ` • ${deal.introducer}`}
                            </DealInfo>
                          </DealItem>
                        ))
                      )}
                    </DealList>
                  </>
                ) : (
                  <div style={{ 
                    padding: '0.75rem', 
                    background: '#f8f9fa', 
                    borderRadius: '4px',
                    fontSize: '0.95rem'
                  }}>
                    {deals.find(d => d.id === formData.dealId)?.productName || ''} 
                    {deals.find(d => d.id === formData.dealId)?.proposalMenu && 
                      `(${deals.find(d => d.id === formData.dealId)?.proposalMenu})`}
                  </div>
                )}
              </FormGroup>


              <FormGroup>
                <Label>提案インフルエンサー（複数選択可）</Label>
                <CheckboxList>
                  {influencers.map(influencer => (
                    <CheckboxItem key={influencer.id}>
                      <input
                        type="checkbox"
                        checked={formData.selectedInfluencers.includes(influencer.id)}
                        onChange={() => handleInfluencerToggle(influencer.id)}
                      />
                      <span>{influencer.name}</span>
                      {influencer.snsHandle && (
                        <span style={{ color: '#999', fontSize: '0.875rem' }}>
                          ({influencer.snsHandle})
                        </span>
                      )}
                      {influencer.proposalStatus && influencer.proposalStatus !== '提案予定' && (
                        <span style={{ 
                          marginLeft: '0.5rem', 
                          padding: '0.125rem 0.5rem', 
                          backgroundColor: '#e0e0e0', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem' 
                        }}>
                          {influencer.proposalStatus}
                        </span>
                      )}
                    </CheckboxItem>
                  ))}
                </CheckboxList>
              </FormGroup>

              <ButtonGroup>
                <SaveButton type="submit">
                  {editingProposal ? '更新' : '登録'}
                </SaveButton>
                <CancelButton type="button" onClick={() => setShowModal(false)}>
                  キャンセル
                </CancelButton>
              </ButtonGroup>
            </form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default CastingManagePage;