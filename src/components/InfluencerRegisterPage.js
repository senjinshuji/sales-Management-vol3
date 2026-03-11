import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase.js';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FiUpload, FiDownload } from 'react-icons/fi';

const Container = styled.div`
  max-width: 1000px;
  margin: 2rem auto;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: bold;
  color: #555;
  font-size: 0.9rem;
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

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
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

const UploadButton = styled(Button)`
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: linear-gradient(135deg, #219a52, #27ae60);
  }
`;

const CSVSection = styled.div`
  background: #f8f9fa;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
`;

const FileInput = styled.input`
  display: none;
`;

const PreviewTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.9rem;
`;

const PreviewTh = styled.th`
  background: #f1f2f6;
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: left;
  font-weight: bold;
`;

const PreviewTd = styled.td`
  border: 1px solid #ddd;
  padding: 0.5rem;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 2px solid #f1f2f6;
`;

const Tab = styled.button`
  padding: 1rem 2rem;
  border: none;
  background: ${props => props.active ? '#3498db' : 'transparent'};
  color: ${props => props.active ? 'white' : '#666'};
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.active ? '#2980b9' : '#f8f9fa'};
  }
`;

const ErrorMessage = styled.div`
  background: #ffe6e6;
  color: #e74c3c;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  background: #e6ffe6;
  color: #27ae60;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const Required = styled.span`
  color: #e74c3c;
  margin-left: 4px;
`;

const PriceInputGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const PriceField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InfluencerRegisterPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
  const [csvData, setCsvData] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importSuccess, setImportSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    snsHandle: '',
    tiktokFollowerCount: '',
    instagramFollowerCount: '',
    youtubeFollowerCount: '',
    tiktokPrice: '',
    instagramPrice: '',
    youtubePrice: '',
    secondaryUsageFee1Month: '',
    secondaryUsageFee2Months: '',
    secondaryUsageFee3Months: '',
    agency: '',
    remarks: '',
    proposalStatus: '提案予定'
  });

  useEffect(() => {
    if (id) {
      fetchInfluencer();
    }
  }, [id]);

  const fetchInfluencer = async () => {
    try {
      const docRef = doc(db, 'influencers', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          name: data.name || '',
          snsHandle: data.snsHandle || '',
          tiktokFollowerCount: data.tiktokFollowerCount || data.followerCount || '',
          instagramFollowerCount: data.instagramFollowerCount || '',
          youtubeFollowerCount: data.youtubeFollowerCount || '',
          tiktokPrice: data.tiktokPrice || '',
          instagramPrice: data.instagramPrice || '',
          youtubePrice: data.youtubePrice || '',
          secondaryUsageFee1Month: data.secondaryUsageFee1Month || '',
          secondaryUsageFee2Months: data.secondaryUsageFee2Months || '',
          secondaryUsageFee3Months: data.secondaryUsageFee3Months || '',
          agency: data.agency || '',
          remarks: data.remarks || '',
          proposalStatus: data.proposalStatus || '提案予定'
        });
      }
    } catch (error) {
      console.error('Error fetching influencer:', error);
      alert('インフルエンサー情報の取得に失敗しました');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // CSV関連の関数
  const parseNumber = (str) => {
    if (!str || str.trim() === '') return null;
    // カンマと円マーク、クォートを除去
    const cleaned = str.replace(/[¥,"]/g, '').trim();
    const num = parseInt(cleaned);
    return isNaN(num) ? null : num;
  };

  const handleCSVFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        parseCSVContent(event.target.result);
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      alert('CSVファイルを選択してください');
    }
  };

  const parseCSVContent = (content) => {
    try {
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^\ufeff/, ''));
      
      const data = [];
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (values[0] && values[0].trim() !== '') { // 名前が空でない場合のみ処理
          const influencerData = {
            name: values[0] || '',                              // 名前
            snsHandle: values[1] || '',                         // SNSハンドル
            tiktokFollowerCount: parseNumber(values[2]),        // TikTokフォロワー
            instagramFollowerCount: parseNumber(values[3]),     // Instagramフォロワー
            youtubeFollowerCount: parseNumber(values[4]),       // YouTubeフォロワー
            tiktokPrice: parseNumber(values[5]),               // TikTok料金
            instagramPrice: parseNumber(values[6]),            // Instagram料金
            youtubePrice: parseNumber(values[7]),              // YouTube料金
            secondaryUsageFee1Month: parseNumber(values[8]),   // 二次利用費(1ヶ月)
            secondaryUsageFee2Months: parseNumber(values[9]),  // 二次利用費(2ヶ月)
            secondaryUsageFee3Months: parseNumber(values[10]), // 二次利用費(3ヶ月)
            agency: values[11] || '',                          // 所属事務所
            remarks: values[12] || '',                         // 備考
            proposalStatus: '提案予定'                         // 提案状況（固定）
          };
          
          data.push(influencerData);
        }
      }
      
      setCsvData(data);
      setImportErrors(errors);
      
      if (data.length > 0) {
        setImportSuccess(`${data.length}件のインフルエンサーデータを読み込みました`);
      }
    } catch (error) {
      setImportErrors(['CSVファイルの解析に失敗しました: ' + error.message]);
    }
  };

  const handleBulkImport = async () => {
    if (csvData.length === 0) {
      alert('登録するデータがありません');
      return;
    }
    
    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    try {
      for (const influencerData of csvData) {
        try {
          const dataToSave = {
            ...influencerData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          await addDoc(collection(db, 'influencers'), dataToSave);
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${influencerData.name}: ${error.message}`);
        }
      }
      
      if (successCount > 0) {
        setImportSuccess(`${successCount}件のインフルエンサーを登録しました`);
      }
      
      if (errorCount > 0) {
        setImportErrors(errors);
      }
      
      if (successCount > 0 && errorCount === 0) {
        setTimeout(() => {
          navigate('/if/list');
        }, 2000);
      }
    } catch (error) {
      setImportErrors(['一括登録中にエラーが発生しました: ' + error.message]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = '名前,SNSハンドル,TikTokフォロワー,Instagramフォロワー,YouTubeフォロワー,TikTok料金,Instagram料金,YouTube料金,二次利用費(1ヶ月),二次利用費(2ヶ月),二次利用費(3ヶ月),所属事務所,備考\n' +
                      '山田太郎,@yamada_taro,100000,200000,50000,500000,300000,800000,100000,150000,200000,〇〇プロダクション,サンプルデータです\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'influencer_template.csv';
    link.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('名前は必須項目です');
      return;
    }

    setIsLoading(true);

    try {
      const influencerData = {
        name: formData.name.trim(),
        snsHandle: formData.snsHandle.trim(),
        tiktokFollowerCount: formData.tiktokFollowerCount ? parseInt(formData.tiktokFollowerCount) : null,
        instagramFollowerCount: formData.instagramFollowerCount ? parseInt(formData.instagramFollowerCount) : null,
        youtubeFollowerCount: formData.youtubeFollowerCount ? parseInt(formData.youtubeFollowerCount) : null,
        tiktokPrice: formData.tiktokPrice ? parseInt(formData.tiktokPrice) : null,
        instagramPrice: formData.instagramPrice ? parseInt(formData.instagramPrice) : null,
        youtubePrice: formData.youtubePrice ? parseInt(formData.youtubePrice) : null,
        secondaryUsageFee1Month: formData.secondaryUsageFee1Month ? parseInt(formData.secondaryUsageFee1Month) : null,
        secondaryUsageFee2Months: formData.secondaryUsageFee2Months ? parseInt(formData.secondaryUsageFee2Months) : null,
        secondaryUsageFee3Months: formData.secondaryUsageFee3Months ? parseInt(formData.secondaryUsageFee3Months) : null,
        agency: formData.agency.trim(),
        remarks: formData.remarks.trim(),
        proposalStatus: formData.proposalStatus,
        updatedAt: serverTimestamp()
      };

      if (id) {
        await updateDoc(doc(db, 'influencers', id), influencerData);
        alert('インフルエンサー情報を更新しました');
      } else {
        influencerData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'influencers'), influencerData);
        alert('インフルエンサーを登録しました');
      }

      navigate('/if/list');
    } catch (error) {
      console.error('Error saving influencer:', error);
      alert('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>{id ? 'インフルエンサー編集' : 'インフルエンサー登録'}</Title>
      
      {!id && (
        <TabContainer>
          <Tab 
            active={activeTab === 'single'} 
            onClick={() => setActiveTab('single')}
          >
            単体登録
          </Tab>
          <Tab 
            active={activeTab === 'bulk'} 
            onClick={() => setActiveTab('bulk')}
          >
            一括登録 (CSV)
          </Tab>
        </TabContainer>
      )}
      
      {activeTab === 'bulk' && !id && (
        <CSVSection>
          <h3>CSVファイル一括登録</h3>
          <p>CSVファイルからインフルエンサー情報を一括で登録できます</p>
          
          <ButtonGroup style={{justifyContent: 'center', marginBottom: '1rem'}}>
            <UploadButton onClick={downloadTemplate}>
              <FiDownload /> テンプレートダウンロード
            </UploadButton>
          </ButtonGroup>
          
          <FileInput 
            type="file" 
            accept=".csv" 
            onChange={handleCSVFileSelect}
            id="csvFile"
          />
          <UploadButton onClick={() => document.getElementById('csvFile').click()}>
            <FiUpload /> CSVファイルを選択
          </UploadButton>
          
          {csvFile && <p style={{marginTop: '1rem'}}>選択ファイル: {csvFile.name}</p>}
          
          {importErrors.length > 0 && (
            <ErrorMessage>
              <strong>エラー:</strong>
              <ul>
                {importErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </ErrorMessage>
          )}
          
          {importSuccess && (
            <SuccessMessage>
              {importSuccess}
            </SuccessMessage>
          )}
          
          {csvData.length > 0 && (
            <div>
              <h4>プレビュー ({csvData.length}件)</h4>
              <PreviewTable>
                <thead>
                  <tr>
                    <PreviewTh>名前</PreviewTh>
                    <PreviewTh>SNSハンドル</PreviewTh>
                    <PreviewTh>TikTok<br/>フォロワー</PreviewTh>
                    <PreviewTh>Instagram<br/>フォロワー</PreviewTh>
                    <PreviewTh>YouTube<br/>フォロワー</PreviewTh>
                    <PreviewTh>TikTok<br/>料金</PreviewTh>
                    <PreviewTh>Instagram<br/>料金</PreviewTh>
                    <PreviewTh>YouTube<br/>料金</PreviewTh>
                    <PreviewTh>二次利用費<br/>(1/2/3ヶ月)</PreviewTh>
                    <PreviewTh>所属事務所</PreviewTh>
                    <PreviewTh>備考</PreviewTh>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 10).map((data, index) => (
                    <tr key={index}>
                      <PreviewTd>{data.name}</PreviewTd>
                      <PreviewTd>{data.snsHandle || '-'}</PreviewTd>
                      <PreviewTd>{data.tiktokFollowerCount?.toLocaleString() || '-'}</PreviewTd>
                      <PreviewTd>{data.instagramFollowerCount?.toLocaleString() || '-'}</PreviewTd>
                      <PreviewTd>{data.youtubeFollowerCount?.toLocaleString() || '-'}</PreviewTd>
                      <PreviewTd>{data.tiktokPrice ? `¥${data.tiktokPrice.toLocaleString()}` : '-'}</PreviewTd>
                      <PreviewTd>{data.instagramPrice ? `¥${data.instagramPrice.toLocaleString()}` : '-'}</PreviewTd>
                      <PreviewTd>{data.youtubePrice ? `¥${data.youtubePrice.toLocaleString()}` : '-'}</PreviewTd>
                      <PreviewTd>
                        {data.secondaryUsageFee1Month || data.secondaryUsageFee2Months || data.secondaryUsageFee3Months ? (
                          <span style={{ fontSize: '0.75rem' }}>
                            {data.secondaryUsageFee1Month ? `¥${data.secondaryUsageFee1Month.toLocaleString()}` : '-'} /<br/>
                            {data.secondaryUsageFee2Months ? `¥${data.secondaryUsageFee2Months.toLocaleString()}` : '-'} /<br/>
                            {data.secondaryUsageFee3Months ? `¥${data.secondaryUsageFee3Months.toLocaleString()}` : '-'}
                          </span>
                        ) : '-'}
                      </PreviewTd>
                      <PreviewTd>{data.agency || '-'}</PreviewTd>
                      <PreviewTd>{data.remarks || '-'}</PreviewTd>
                    </tr>
                  ))}
                </tbody>
              </PreviewTable>
              {csvData.length > 10 && (
                <p style={{textAlign: 'center', marginTop: '1rem', color: '#666'}}>
                  ...他 {csvData.length - 10} 件
                </p>
              )}
              
              <ButtonGroup style={{justifyContent: 'center', marginTop: '2rem'}}>
                <SaveButton 
                  type="button" 
                  onClick={handleBulkImport}
                  disabled={isLoading}
                >
                  {isLoading ? '登録中...' : `${csvData.length}件を一括登録`}
                </SaveButton>
                <CancelButton type="button" onClick={() => setCsvData([])}>
                  クリア
                </CancelButton>
              </ButtonGroup>
            </div>
          )}
        </CSVSection>
      )}
      
      {activeTab === 'single' && (
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>
            名前<Required>*</Required>
          </Label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="例: 山田太郎"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>SNSハンドル名</Label>
          <Input
            type="text"
            name="snsHandle"
            value={formData.snsHandle}
            onChange={handleChange}
            placeholder="例: @yamada_taro"
          />
        </FormGroup>

        <PriceInputGroup>
          <PriceField>
            <Label>TikTokフォロワー数</Label>
            <Input
              type="number"
              name="tiktokFollowerCount"
              value={formData.tiktokFollowerCount}
              onChange={handleChange}
              placeholder="例: 50000"
              min="0"
            />
          </PriceField>

          <PriceField>
            <Label>Instagramフォロワー数</Label>
            <Input
              type="number"
              name="instagramFollowerCount"
              value={formData.instagramFollowerCount}
              onChange={handleChange}
              placeholder="例: 30000"
              min="0"
            />
          </PriceField>

          <PriceField>
            <Label>YouTubeフォロワー数</Label>
            <Input
              type="number"
              name="youtubeFollowerCount"
              value={formData.youtubeFollowerCount}
              onChange={handleChange}
              placeholder="例: 10000"
              min="0"
            />
          </PriceField>
        </PriceInputGroup>

        <PriceInputGroup>
          <PriceField>
            <Label>TikTok料金（円）</Label>
            <Input
              type="number"
              name="tiktokPrice"
              value={formData.tiktokPrice}
              onChange={handleChange}
              placeholder="例: 100000"
              min="0"
            />
          </PriceField>

          <PriceField>
            <Label>Instagram料金（円）</Label>
            <Input
              type="number"
              name="instagramPrice"
              value={formData.instagramPrice}
              onChange={handleChange}
              placeholder="例: 80000"
              min="0"
            />
          </PriceField>

          <PriceField>
            <Label>YouTube料金（円）</Label>
            <Input
              type="number"
              name="youtubePrice"
              value={formData.youtubePrice}
              onChange={handleChange}
              placeholder="例: 150000"
              min="0"
            />
          </PriceField>
        </PriceInputGroup>

        <PriceInputGroup>
          <PriceField>
            <Label>二次利用費（1ヶ月）</Label>
            <Input
              type="number"
              name="secondaryUsageFee1Month"
              value={formData.secondaryUsageFee1Month}
              onChange={handleChange}
              placeholder="例: 50000"
              min="0"
            />
          </PriceField>

          <PriceField>
            <Label>二次利用費（2ヶ月）</Label>
            <Input
              type="number"
              name="secondaryUsageFee2Months"
              value={formData.secondaryUsageFee2Months}
              onChange={handleChange}
              placeholder="例: 80000"
              min="0"
            />
          </PriceField>

          <PriceField>
            <Label>二次利用費（3ヶ月）</Label>
            <Input
              type="number"
              name="secondaryUsageFee3Months"
              value={formData.secondaryUsageFee3Months}
              onChange={handleChange}
              placeholder="例: 100000"
              min="0"
            />
          </PriceField>
        </PriceInputGroup>

        <FormGroup>
          <Label>所属事務所名</Label>
          <Input
            type="text"
            name="agency"
            value={formData.agency}
            onChange={handleChange}
            placeholder="例: 〇〇プロダクション"
          />
        </FormGroup>

        <FormGroup>
          <Label>提案状況</Label>
          <Select
            name="proposalStatus"
            value={formData.proposalStatus}
            onChange={handleChange}
          >
            <option value="提案予定">提案予定</option>
            <option value="提案済">提案済</option>
            <option value="回答待ち">回答待ち</option>
            <option value="OK（確定）">OK（確定）</option>
            <option value="NG（辞退）">NG（辞退）</option>
            <option value="未定（保留）">未定（保留）</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>備考</Label>
          <TextArea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            placeholder="その他の情報があれば記入してください"
          />
        </FormGroup>

        <ButtonGroup>
          <SaveButton type="submit" disabled={isLoading}>
            {isLoading ? '保存中...' : (id ? '更新' : '登録')}
          </SaveButton>
          <CancelButton type="button" onClick={() => navigate('/if/list')}>
            キャンセル
          </CancelButton>
        </ButtonGroup>
      </Form>
      )}
    </Container>
  );
};

export default InfluencerRegisterPage;