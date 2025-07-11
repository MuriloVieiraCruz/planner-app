import { Input } from "@/components/input"
import { Alert, Image, Keyboard, Text, View } from "react-native"
import { MapPin, Calendar as IconCalendar, Settings2, UserRoundPlus, ArrowRight, AtSign } from "lucide-react-native"
import { colors } from "@/styles/colors"
import { Button } from "@/components/button"
import { useEffect, useState } from "react"
import { Modal } from "@/components/modal"
import { Calendar } from "@/components/calendar"
import { calendarUtils, DatesSelected } from "@/utils/calendarUtils"
import { DateData } from "react-native-calendars"
import dayjs from "dayjs"
import { GuestEmail } from "@/components/email"
import { validateInput } from "@/utils/validateInput"
import { tripStorage } from "@/storage/trip"
import { router } from "expo-router"
import { tripServer } from "@/server/trip-server"
import { Loading } from "@/components/loading"

enum StepForm {
  TRIP_DETAILS = 1,
  ADD_EMAIL = 2,
}

enum MODAL {
  NONE = 0,
  CALENDAR = 1,
  GUESTS = 2
}

export default function Index() {
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [isGettingTrip, setIsGettingTrip] = useState(true);

  const [stepForm, setStepForm] = useState(StepForm.TRIP_DETAILS);
  const [showModal, setShowModal] = useState(MODAL.NONE);
  const [selectedDates, setSelectedDates] = useState({} as DatesSelected);
  const [destination, setDestination] = useState("");
  const [emailToInvite, setEmailToInvite] = useState("");
  const [emailsToInvite, setEmailsToInvite] = useState<string[]>([]); 

  function handleNextStepForm() {
    if (destination.trim().length === 0 || !selectedDates.startsAt ||
    !selectedDates.endsAt) {
      return Alert.alert("Detalhes da viagem",
        "Preecha todas as informações da viagem para seguir."
      )
    }

    if (destination.length < 4) {
      return Alert.alert("Detalhes da viagem",
        "O destino deve conter mais de 4 caracteres."
      )
    }

    if (stepForm === StepForm.TRIP_DETAILS) {
      return setStepForm(StepForm.ADD_EMAIL);
    }

    Alert.alert("Nova viagem", "Confirmar viagem?", [
      { text: "Não", style: "cancel" },
      { text: "Sim", onPress: createTrip },
    ])
  }

  function handleSelectDate(selectedDay: DateData) {
    const dates = calendarUtils.orderStartsAtAndEndsAt({
      startsAt: selectedDates.startsAt,
      endsAt: selectedDates.endsAt,
      selectedDay
    })

    setSelectedDates(dates);
  }

  function handleRemoveEmail(emailToRemove: string) {
    setEmailsToInvite((prevState) => 
      prevState.filter((email) => email !== emailToRemove));
  }

  function handleAddEmail() {
    if (!validateInput.email(emailToInvite)) {
      Alert.alert("Convidado",
        "Por favor insira um e-mail válido."
      )
    }

    const emailAlreadyExists = emailsToInvite.find(
      (email) => email === emailToInvite);

    if (emailAlreadyExists) {
      Alert.alert("Convidado",
        "O e-mail informado já foi adicionado."
      )
    }

    setEmailsToInvite((prevstate) => [...prevstate, emailToInvite]);
    setEmailToInvite("");
  }

  async function saveTrip(tripId: string) {
    try {
      await tripStorage.save(tripId);
      router.navigate({
        pathname: "/trip/[id]",
        params:   { id: tripId }
      });

    } catch (error) {
      Alert.alert("Salvar",
        "Não foi possível salvar o id da viagem."
      )
    }
  }

  async function createTrip() {
    try {
      setIsCreatingTrip(true);

      const newTrip = await tripServer.create({
        destination,
        starts_at: dayjs(selectedDates.startsAt?.dateString).toString(),
        ends_at: dayjs(selectedDates.endsAt?.dateString).toString(),
        emails_to_invite: emailsToInvite
      });

      Alert.alert("Nova Viagem",
        "Viagem criada com sucesso!",[
          {
            text: "OK",
            onPress: () => saveTrip(newTrip.tripId),
          }
        ]
      )
    } catch (error) {
      throw error;
    } finally {
      setIsCreatingTrip(false);
    }
  }

  async function getTrip() {
    try {
      const tripId = await tripStorage.get();

      console.log("TRipID", tripId);

      if (!tripId) {
        return setIsGettingTrip(false);
      }

      const trip = await tripServer.getById(tripId);
      console.log("Trip", trip);

      if (trip) {
        return router.navigate({
          pathname: "/trip/[id]",
          params:   { id: tripId }
        });
      }
    } catch (error) {
      setIsGettingTrip(false);
      console.log(error);
    }
  }

  useEffect(() => {
    console.log("attatata");
    getTrip();
  }, []);

  if (isGettingTrip) {
    return <Loading />
  }

  return (
    <View className="flex-1 items-center justify-center px-5">
      <Image 
        source={require("@/assets/logo.png")}
        className="h-8"
        resizeMode="contain"
      />

      <Image
        source={require("@/assets/bg.png")}
        className="absolute"
      />

        <Text className="text-zinc-400 font-regular text-center text-lg mt-3">
          Convide seus amigos e planeje sua {"\n"} próxima viagem
        </Text>

        <View className="w-full bg-zinc-900 p-4 rounded-xl my-8 border border-zinc-800">
          <Input>
            <MapPin color={colors.zinc[400]} size={20} />
            <Input.Field 
              placeholder="Para onde?" 
              editable={stepForm === StepForm.TRIP_DETAILS}
              onChangeText={setDestination}
              value={destination}
            />
          </Input>

          <Input>
            <IconCalendar color={colors.zinc[400]} size={20} />
            <Input.Field 
              placeholder="Quando?"
              editable={stepForm === StepForm.TRIP_DETAILS}
              onFocus={() => Keyboard.dismiss()}
              showSoftInputOnFocus={false}
              onPressIn={() => 
                stepForm === StepForm.TRIP_DETAILS 
                && setShowModal(MODAL.CALENDAR)
              }
              value={selectedDates.formatDatesInText}
            />
          </Input>

          { stepForm === StepForm.ADD_EMAIL && (
            <>
              <View className="border-b py-3 border-zinc-800">
                <Button 
                  variant="secondary" 
                  onPress={() => setStepForm(StepForm.TRIP_DETAILS)}
                >
                  <Button.Title>Alterar local/data</Button.Title>
                  <Settings2 color={colors.zinc[200]} size={20} />
                </Button>
              </View>

              <Input>
                <UserRoundPlus color={colors.zinc[400]} size={20} />
                <Input.Field 
                  placeholder="Quem estará na viagem?"
                  autoCorrect={false}
                  onFocus={() => {
                    Keyboard.dismiss()
                    setShowModal(MODAL.GUESTS);
                  }}
                  showSoftInputOnFocus={false}
                  value={
                    emailsToInvite.length > 0
                    ? `${emailsToInvite.length} pessoas(a) convidadas(a)`
                    : ""
                  }
                />
              </Input>
            </>
          )}

          <Button onPress={handleNextStepForm} isLoading={isCreatingTrip}>
            <Button.Title>
              {stepForm === StepForm.TRIP_DETAILS
              ? "Continuar"
              : "Confirmar Viagem"}
            </Button.Title>
            <ArrowRight color={colors.lime[950]} size={20} />
          </Button>
          
        </View>

        <Text className="text-zinc-500 font-regular text-center text-base">
          Ao planejar sua viagem pela plann.er você automaticamente concorda com nossos 
          <Text className="text-zinc-300 underline"> termos de uso e políticas de privacidade.</Text>
        </Text>

        <Modal
          title="Selecionar Datas"
          subtitle="Selecione a data de ida e volta da viagem"
          visible={showModal === MODAL.CALENDAR}
          onClose={() => setShowModal(MODAL.NONE)}
        >
          <View className="gap-4 mt-4">
            <Calendar
              minDate={dayjs().toISOString()}
              onDayPress={handleSelectDate}
              markedDates={selectedDates.dates}
            />

            <Button onPress={() => setShowModal(MODAL.NONE)}>
              <Button.Title>Confirmar</Button.Title>
            </Button>
          </View>
        </Modal>

        <Modal
          title="Selecionar convidados"
          subtitle="Os convidados irão receber e-mails para confirmar a participação na viagem"
          visible={showModal === MODAL.GUESTS}
          onClose={() => setShowModal(MODAL.NONE)}
        >
          <View className="my-2 flex-wrap gap-2 border-b border-zinc-800 py-5 items-start">
            {
              emailsToInvite.length > 0 ? (
                emailsToInvite.map((email) => (
                  <GuestEmail key={email} email={email} onRemove={() => handleRemoveEmail(email)}/>
                ))
              ) : (
                <Text className="text-zinc-600 text-base font-regular">Nenhum e-mail adicionado</Text>
              )
            }
            
          </View>

          <View className="gap-4 mt-4">
            <Input variant="secondary">
              <AtSign color={colors.zinc[400]} size={20} />
              <Input.Field
                placeholder="Digite o e-mail do convidado"
                keyboardType="email-address"
                onChangeText={(email) => setEmailToInvite(email.toLowerCase())}
                value={emailToInvite}
                returnKeyType="send"
                onSubmitEditing={handleAddEmail}
              />
            </Input>

            <Button onPress={handleAddEmail}>
              <Button.Title>Convidar</Button.Title>
            </Button>
          </View>
        </Modal>
    </View>
  )
}