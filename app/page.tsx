import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import LoginForm from '@/components/LoginForm';
import StoreSelection from '@/components/StoreSelection';
import ValidationStep from '@/components/ValidationStep';
import CheckoutStep from '@/components/CheckoutStep';
import { supabase } from '@/integrations/supabase/client'; // import seguro

type AppStep = 'login' | 'store-selection' | 'validation-1' | 'validation-2' | 'validation-3' | 'checkout' | 'completed';

interface UserMetadata {
  nome?: string;
  regiao?: string;
  lojas?: string;
}

interface ValidationData {
  step: number;
  title: string;
  sectionKey: string;
  lots: Array<{
    id: string;
    photo: string | null;
    quantity: string;
    expiry_date?: string;
    lot_code?: string;
    ocrLoading?: boolean;
    validity?: string;
    batch?: string;
    editedManually?: boolean;
  }>;
  finalPhoto: string | null;
  skipped?: boolean;
  observation?: string;
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>('login');
  const [userId, setUserId] = useState<string | null>(null);
  const [validationId, setValidationId] = useState<string | null>(null);
  const [userData, setUserData] = useState({
    username: '',
    city: '',
    store: '',
    userMetadata: null as UserMetadata | null,
    validation1: null as ValidationData | null,
    validation2: null as ValidationData | null,
    validation3: null as ValidationData | null,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (currentStep.startsWith('validation-') || currentStep === 'checkout') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleLogin = async (username: string, userMetadata?: UserMetadata) => {
    try {
      const { data: promotor, error } = await supabase
        .from('promotores')
        .select('"ID", "Nome"')
        .eq('ID', username)
        .single();

      if (error || !promotor) {
        toast({
          title: "Erro no login",
          description: "Usuário não encontrado na base de promotores.",
          variant: "destructive"
        });
        return;
      }

      setUserId(promotor.ID);
      setUserData(prev => ({ ...prev, username, userMetadata }));
      setCurrentStep('store-selection');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erro no login",
        description: "Erro inesperado ao fazer login.",
        variant: "destructive"
      });
    }
  };

  const handleStoreSelection = async (city: string, store: string) => {
    if (!userId) {
      toast({
        title: "Erro",
        description: "ID do usuário não encontrado.",
        variant: "destructive"
      });
      return;
    }

    const { createValidationId } = await import('@/utils/database');
    const newValidationId = await createValidationId(userId);

    if (!newValidationId) {
      toast({
        title: "Erro",
        description: "Falha ao criar registro de validação.",
        variant: "destructive"
      });
      return;
    }

    setValidationId(newValidationId);
    setUserData(prev => ({ ...prev, city, store }));
    setCurrentStep('validation-1');
  };

  const mergeLots = (prevLots: ValidationData["lots"], newLots: ValidationData["lots"]) => {
    const map = new Map<string, any>();
    prevLots.forEach(l => map.set(l.id, { ...l }));
    newLots.forEach(l => {
      const hasInfo = Object.keys(l).some(k => k !== "id" && l[k as keyof typeof l]);
      if (!hasInfo) return;
      const prev = map.get(l.id) || { id: l.id };
      map.set(l.id, { ...prev, ...l });
    });
    return Array.from(map.values());
  };

  const handleSkipChange = (sectionKey: string, skipped: boolean) => {
    setUserData(prev => {
      const validationKey = mapSectionToValidation(sectionKey);
      if (!validationKey) return prev;
      return {
        ...prev,
        [validationKey]: {
          ...prev[validationKey],
          skipped
        }
      };
    });
  };

  const mergeStepData = (key: 'validation1' | 'validation2' | 'validation3', data: ValidationData) => {
    setUserData(prev => {
      const prevLots = prev[key]?.lots || [];
      const mergedLots = data.lots ? mergeLots(prevLots, data.lots) : prevLots;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          ...data,
          skipped: data.skipped ?? prev[key]?.skipped,
          lots: mergedLots
        }
      };
    });
  };

  const handleValidationStep = (data: ValidationData) => {
    if (currentStep === 'validation-1') {
      mergeStepData('validation1', data);
      setCurrentStep('validation-2');
    } else if (currentStep === 'validation-2') {
      mergeStepData('validation2', data);
      setCurrentStep('validation-3');
    } else if (currentStep === 'validation-3') {
      mergeStepData('validation3', data);
      setCurrentStep('checkout');
    }
  };

  const mapSectionToValidation = (sectionKey: string) => {
    if (sectionKey === 'camaraFria') return 'validation1';
    if (sectionKey === 'refrigeradorConv') return 'validation2';
    if (sectionKey === 'gondola') return 'validation3';
    return null;
  };

  const handleLotChange = (sectionKey: string, lotId: string, partial: Partial<any>) => {
    setUserData(prev => {
      const validationKey = mapSectionToValidation(sectionKey);
      if (!validationKey) return prev;

      const existingData = prev[validationKey] as ValidationData | null;
      const currentLots = existingData?.lots || [];
      const currentFinalPhoto = existingData?.finalPhoto || null;

      const lotExists = currentLots.some(lot => lot.id === lotId);
      const updatedLots = lotExists
        ? currentLots.map(lot => (lot.id === lotId ? { ...lot, ...partial } : lot))
        : [...currentLots, { id: lotId, photo: null, quantity: '', ...partial }];

      return {
        ...prev,
        [validationKey]: {
          ...existingData,
          step: existingData?.step || 0,
          title: existingData?.title || '',
          sectionKey,
          lots: updatedLots,
          finalPhoto: currentFinalPhoto,
        }
      };
    });
  };

  const handleRemoveLot = (sectionKey: string, lotId: string) => {
    setUserData(prev => {
      const validationKey = mapSectionToValidation(sectionKey);
      if (!validationKey) return prev;
      const existingData = prev[validationKey] as ValidationData | null;
      const updatedLots = existingData?.lots?.filter(lot => lot.id !== lotId) || [];
      return {
        ...prev,
        [validationKey]: {
          ...existingData,
          lots: updatedLots,
        }
      };
    });
  };

  const handleObservationChange = (sectionKey: string, observation: string) => {
    setUserData(prev => {
      const validationKey = mapSectionToValidation(sectionKey);
      if (!validationKey) return prev;
      const existingData = prev[validationKey] as ValidationData | null;
      return {
        ...prev,
        [validationKey]: {
          ...existingData,
          observation,
        }
      };
    });
  };

  const handleFinalPhotoChange = (sectionKey: string, photo: string | null) => {
    setUserData(prev => {
      const validationKey = mapSectionToValidation(sectionKey);
      if (!validationKey) return prev;
      const existingData = prev[validationKey] as ValidationData | null;
      const currentLots = existingData?.lots || [];
      return {
        ...prev,
        [validationKey]: {
          ...existingData,
          step: existingData?.step || 0,
          title: existingData?.title || '',
          sectionKey,
          lots: currentLots,
          finalPhoto: photo,
        }
      };
    });
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'validation-1': setCurrentStep('store-selection'); break;
      case 'validation-2': setCurrentStep('validation-1'); break;
      case 'validation-3': setCurrentStep('validation-2'); break;
      case 'checkout': setCurrentStep('validation-3'); break;
      default: break;
    }
  };

  const handleFinish = () => {
    setCurrentStep('completed');
    setTimeout(() => {
      setCurrentStep('login');
      setUserId(null);
      setValidationId(null);
      setUserData({
        username: '',
        city: '',
        store: '',
        userMetadata: null,
        validation1: null,
        validation2: null,
        validation3: null,
      });
    }, 3000);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'login': return <LoginForm onLogin={handleLogin} />;
      case 'store-selection': return <StoreSelection onNext={handleStoreSelection} userMetadata={userData.userMetadata} />;
      case 'validation-1': return (
        <ValidationStep
          key="camaraFria"
          step={1}
          title="Câmara fria:"
          finalPhotoLabel="Adicionar foto do resultado final da câmara fria"
          sectionKey="camaraFria"
          onNext={handleValidationStep}
          onBack={handleBack}
          onLotChange={handleLotChange}
          onRemoveLot={handleRemoveLot}
          onFinalPhotoChange={handleFinalPhotoChange}
          skipped={userData.validation1?.skipped ?? false}
          onSkipChange={handleSkipChange}
          initialData={userData.validation1 ? {
            lots: userData.validation1.lots,
            finalPhoto: userData.validation1.finalPhoto,
            observation: userData.validation1.observation
          } : undefined}
          onObservationChange={handleObservationChange}
        />
      );
      case 'validation-2': return (
        <ValidationStep
          key="refrigeradorConv"
          step={2}
          title="Refrigerador convencional do estabelecimento:"
          finalPhotoLabel="Adicionar foto do resultado final do refrigerador convencional do estabelecimento"
          sectionKey="refrigeradorConv"
          onNext={handleValidationStep}
          onBack={handleBack}
          onLotChange={handleLotChange}
          onRemoveLot={handleRemoveLot}
          onFinalPhotoChange={handleFinalPhotoChange}
          skipped={userData.validation2?.skipped ?? false}
          onSkipChange={handleSkipChange}
          initialData={userData.validation2 ? {
            lots: userData.validation2.lots,
            finalPhoto: userData.validation2.finalPhoto,
            observation: userData.validation2.observation
          } : undefined}
          onObservationChange={handleObservationChange}
        />
      );
      case 'validation-3': return (
        <ValidationStep
          key="gondola"
          step={3}
          title="Gôndola (refrigerador Empresa):"
          finalPhotoLabel="Adicionar foto do resultado final da gôndola (refrigerador Empresa)"
          sectionKey="gondola"
          onNext={handleValidationStep}
          onBack={handleBack}
          onLotChange={handleLotChange}
          onRemoveLot={handleRemoveLot}
          onFinalPhotoChange={handleFinalPhotoChange}
          skipped={userData.validation3?.skipped ?? false}
          onSkipChange={handleSkipChange}
          initialData={userData.validation3 ? {
            lots: userData.validation3.lots,
            finalPhoto: userData.validation3.finalPhoto,
            observation: userData.validation3.observation
          } : undefined}
          onObservationChange={handleObservationChange}
        />
      );
      case 'checkout':
        return <CheckoutStep onFinish={handleFinish} onBack={handleBack} userId={userId} validationId={validationId} userData={userData} />;
      case 'completed':
        return (
          <div className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="text-center">
              <h1 className="text-2xl font-medium text-empresa-abastecimento-green mb-4">Abastecimento Concluído!</h1>
              <p className="text-empresa-abastecimento-gray">Obrigado por utilizar o sistema da empresa.</p>
            </div>
          </div>
        );
      default: return <LoginForm onLogin={handleLogin} />;
    }
  };

  return renderCurrentStep();
};

export default Index;
