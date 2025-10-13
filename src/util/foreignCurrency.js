import axios from "axios";

async function getExchangeRate(fromCurrency, toCurrency) {
  try {
    const response = await axios.get(
      `https://open.er-api.com/v6/latest/${fromCurrency}`
    );

    if (response.data && response.data.rates) {
      const rate = response.data.rates[toCurrency];

      if (rate) {
        console.log(`Tỷ giá 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        return rate;
      } else {
        console.error(`Không tìm thấy tỷ giá cho ${toCurrency}`);
        return null;
      }
    }
  } catch (error) {
    console.error("Lỗi khi lấy tỷ giá:", error.message);
    return null;
  }
}

async function convertCurrency(amount, from, to) {
  console.log(`Đang chuyển đổi ${amount} ${from} sang ${to}...`);
  const rate = await getExchangeRate(from, to);

  if (rate) {
    const result = amount * rate;
    return result;
  } else {
    console.log("The conversion could not be performed.");
  }
}

export { convertCurrency };
